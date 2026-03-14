// Retrieval Augmented Generation (RAG) for PDF

// 1. Load PDF
// 2. extract text
// 3. Clean text
// 4. split into chuncks
// 5. store chunks in memory
// 6. Generate questions based on retrieved chunks


async function extractTextFromPDF(file) {

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let text = "";

    for (let page = 1; page <= pdf.numPages; page++) {

        const pdfPage = await pdf.getPage(page);

        const content = await pdfPage.getTextContent();

        const pageText = content.items
            .map(item => item.str)
            .join(" ");

        text += pageText + "\n";
    }

    return text;
}



function cleanText(text) {
    return text
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


// text chunking
function chunkText(text, chunkSize = 800, overlap = 150) {

    const sentences = text.split(/(?<=[.?!])\s+/);
    const chunks = [];
    let current = "";

    for (const sentence of sentences) {

        if ((current + sentence).length > chunkSize) {
            chunks.push(current.trim());
            current = sentence + " ";
        } else {
            current += sentence + " ";
        }

    }

    if (current) chunks.push(current.trim());

    return chunks;
}


// rag preprocess function
// use this function after a pdf is uploaded 
async function preprocessPDF(file) {
    const rawText = await extractTextFromPDF(file);
    const cleanedText = cleanText(rawText);
    const chunks = chunkText(cleanedText);
    return chunks;
}

export { preprocessPDF };


