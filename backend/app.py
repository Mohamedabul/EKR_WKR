from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime
from uuid import uuid4
from pymongo import MongoClient


from Final import (
    extract_text_from_pdf, 
    extract_text_from_csv, 
    extract_text_from_docx,
    extract_text_from_excel,
    extract_text_from_ppt,
    extract_text_from_txt,
    chunk_text,
    get_custom_prompt_for_pdf_and_docx,
    get_custom_prompt_csv,
    get_custom_prompt_excel,
    get_custom_prompt_pptx,
    llm,
    SentenceTransformerEmbeddings,
    embedding_model,
    summarize_document
)
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Connect to MongoDB
client = MongoClient(
    'mongodb+srv://2217028a:12345678Aa@iqra-db.laaqd.mongodb.net/'
    '?retryWrites=true&w=majority&appName=IQRA-DB'
)
db = client['iqra_db']
conversations_collection = db['chat_conversation']

# Global FAISS index and embeddings
faiss_index = None
embeddings = SentenceTransformerEmbeddings(embedding_model)

@app.route('/logo192.png')
def serve_logo():
    return send_from_directory('public', 'logo192.png')

@app.route('/')
def home():
    return jsonify({'message': 'Server is running'})

@app.route('/uploads/<path:filename>')
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

def get_or_create_conversation_id():
    conv_id = None
    # Check form data (for file uploads)
    if request.form and 'conversation_id' in request.form:
        conv_id = request.form['conversation_id']
    # Also check JSON body (for queries)
    elif request.is_json:
        json_data = request.get_json(silent=True)
        if json_data and 'conversation_id' in json_data:
            conv_id = json_data['conversation_id']

    if not conv_id:
        conv_id = str(uuid4())
    print(f"[DEBUG] Using conversation_id = {conv_id}")
    return conv_id


def store_or_update_conversation(conversation_id, interaction_type, content, file_name=None):
    """
    Store or update a conversation with various types of interactions
    interaction_type: 'file_upload' or 'qa'
    content: dict containing relevant data for the interaction type
    """
    now = datetime.now()
    
    if interaction_type == 'file_upload':
        message = {
            "type": "file_upload",
            "file_name": file_name,
            "summary": content.get('summary'),
            "timestamp": now
        }
    else:  
        message = {
            "type": "qa",
            "query": content.get('query'),
            "response": content.get('response'),
            "timestamp": now
        }

    if conversation_id:
        conversations_collection.update_one(
            {"conversation_id": conversation_id},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": now},
                "$setOnInsert": {
                    "created_at": now,
                    "files": [] if interaction_type == 'qa' else [file_name]
                }
            },
            upsert=True
        )
    else:
        conversation = {
            "conversation_id": str(uuid4()),
            "created_at": now,
            "updated_at": now,
            "files": [file_name] if file_name else [],
            "messages": [message]
        }
        conversations_collection.insert_one(conversation)
        return conversation["conversation_id"]
    
    return conversation_id

@app.route('/upload', methods=['POST'])
async def upload_file():
    global faiss_index
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Get or create conversation_id
    conversation_id = get_or_create_conversation_id()

    # Save file locally
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)
    file_extension = os.path.splitext(file.filename)[1].lower()

    try:
        # Extract text by file extension
        if file_extension == '.pdf':
            text = extract_text_from_pdf(file_path)
        elif file_extension == '.csv':
            text = extract_text_from_csv(file_path)
        elif file_extension in ['.doc', '.docx']:
            text = extract_text_from_docx(file_path)
        elif file_extension in ['.xlsx', '.xls']:
            text = extract_text_from_excel(file_path)
        elif file_extension in ['.ppt', '.pptx']:
            text = extract_text_from_ppt(file_path)
        elif file_extension == '.txt':
            text = extract_text_from_txt(file_path)
        else:
            return jsonify({'error': 'Unsupported file format'}), 400

        # Chunk text & create/merge into FAISS index
        content_chunks = chunk_text(text)
        current_index = FAISS.from_texts(
            texts=content_chunks,
            embedding=embeddings,
            metadatas=[{"source": file.filename, "index": i} for i in range(len(content_chunks))]
        )

        if faiss_index is None:
            faiss_index = current_index
        else:
            faiss_index.merge_from(current_index)

        # Summarize
        summary = await summarize_document(file_path)

        # Store the upload interaction
        store_or_update_conversation(
            conversation_id=conversation_id,
            interaction_type='file_upload',
            content={'summary': summary},
            file_name=file.filename
        )

        return jsonify({
            'summary': summary,
            'conversation_id': conversation_id,
            'message': 'File processed successfully'
        })

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 500

    finally:
        # Clean up local file
        if os.path.exists(file_path):
            os.remove(file_path)

@app.route('/query', methods=['POST', 'OPTIONS'])
async def handle_query():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    # Make sure we have an index
    if faiss_index is None:
        return jsonify({
            'error': 'Please upload a document first to start asking questions.',
            'type': 'warning',
            'title': 'Document Required'
        }), 400

    # Parse JSON body
    data = request.json or {}
    query = data.get('query', '')

    # Same function to get or create conversation_id
    conversation_id = get_or_create_conversation_id()
    query_time = datetime.now()

    if not query.strip():
        return jsonify({
            'error': 'Please provide a question in the text box.',
            'type': 'warning',
            'title': 'Question Required'
        }), 400

    try:
        # Create a retriever from FAISS
        retriever = faiss_index.as_retriever(search_kwargs={"k": 5, "fetch_k": 10})

        # Determine file source from docstore
        doc_keys = list(faiss_index.docstore._dict.keys())
        if not doc_keys:
            return jsonify({'error': 'No document source found in the index'}), 500

        file_source = faiss_index.docstore._dict[doc_keys[0]].metadata.get('source', '')
        file_extension = os.path.splitext(file_source)[1].lower()

        # Choose custom prompt
        if file_extension == '.csv':
            custom_prompt = get_custom_prompt_csv()
        elif file_extension in ['.xlsx', '.xls']:
            custom_prompt = get_custom_prompt_excel()
        elif file_extension in ['.ppt', '.pptx']:
            custom_prompt = get_custom_prompt_pptx()
        else:
            custom_prompt = get_custom_prompt_for_pdf_and_docx()

        # Build QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            chain_type_kwargs={"prompt": custom_prompt, "verbose": True}
        )

        # Run the chain asynchronously
        result = await qa_chain.ainvoke({"query": query})
        response_time = datetime.now()

        if not result or 'result' not in result:
            return jsonify({"error": "No response generated"}), 500

        # Store the query interaction
        store_or_update_conversation(
            conversation_id=conversation_id,
            interaction_type='qa',
            content={
                'query': query,
                'response': result['result']
            }
        )

        return jsonify({
            'query': query,
            'response': result['result'],
            'conversation_id': conversation_id
        })

    except Exception as e:
        print(f"[ERROR] Error processing query: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/conversation/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """
    Fetch the entire conversation (chat history) by conversation_id.
    """
    try:
        conversation = conversations_collection.find_one({"conversation_id": conversation_id})
        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404

        
        if '_id' in conversation:
            conversation['_id'] = str(conversation['_id'])

        return jsonify(conversation), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
