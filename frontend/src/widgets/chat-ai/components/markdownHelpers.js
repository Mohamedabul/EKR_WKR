export function convertToMarkdownWithBullets(originalText) {
    const lines = originalText.split('\n');
    let inSubheading = false;
    const transformedLines = [];
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
  
      // Detect "Subheading:" line
      if (line.match(/^Subheading:\s*/i)) {
        // Convert "Subheading: Something" -> "## Something"
        const headingText = line.replace(/^Subheading:\s*/i, '');
        transformedLines.push(`## ${headingText}`);
        inSubheading = true;
      }
      // If we are under a subheading and the line is not empty, treat it as a bullet
      else if (inSubheading && line.length > 0) {
        transformedLines.push(`- ${line}`);
      }
      // Otherwise, reset subheading flag and keep the line as-is
      else {
        transformedLines.push(line);
        inSubheading = false;
      }
    }
  
    return transformedLines.join('\n');
  }