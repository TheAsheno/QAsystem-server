from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import MarkdownHeaderTextSplitter, CharacterTextSplitter
from langchain_community.document_loaders import TextLoader, PDFMinerLoader
from langchain_community.vectorstores import FAISS
import os
import sys

class Processor:
    def __init__(self, base_path, file_path):
        self.base_path = base_path
        self.file_path = file_path
        self.embedding = HuggingFaceEmbeddings(model_name='bge-large-zh-v1.5')
        self._load_content()
        self._setup_embeddings()

    def _load_content(self):
        self.dirStr, ext = os.path.splitext(self.file_path)
        if ext == ".md":
            self._parse_markdown()
        elif ext == ".txt":
            self.loader = TextLoader(self.file_path, encoding='utf-8')
            self._parse_text()
        elif ext == ".pdf":
            self.loader = PDFMinerLoader(self.file_path)
            self._parse_pdf()
        elif ext == ".docx":
            self._parse_docx()
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    def _parse_markdown(self):
        with open(self.file_path, "r", encoding='utf-8') as f:
            self.page_content = f.read()
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
        ]
        markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on, strip_headers=False)
        self.split_docs = markdown_splitter.split_text(self.page_content)

    def _parse_text(self, chunk_size=500, chunk_overlap=50):
        docs = self.loader.load()
        text_splitter = CharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.split_docs = text_splitter.split_documents(docs)

    def _parse_pdf(self, chunk_size=200, chunk_overlap=20):
        docs = self.loader.load()
        text_splitter = CharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.split_docs = text_splitter.split_text(docs)

    def _parse_docx(self):
        pass

    def _setup_embeddings(self):
        if not os.path.exists(self.base_path):
            os.mkdir(self.base_path)
        db = FAISS.from_documents(self.split_docs, self.embedding)
        db.save_local(self.base_path, index_name=self.dirStr.split("\\")[-1])

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python Process.py <base_path> <file_path>")
        sys.exit(1)

    base_path = sys.argv[1]
    file_path = sys.argv[2]

    processor = Processor(base_path, file_path)