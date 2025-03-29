from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
import os

class KnowledgeBase:
    def __init__(self, embedding_model):
        self.course = None
        self.embedding = HuggingFaceEmbeddings(model_name=embedding_model)
        self.retriever = None

    def load_vectorstore(self):
        base_path = f"./vectorstore/{self.course}"
        if os.path.exists(base_path):
            db = None
            for file in os.listdir(base_path):
                if file.endswith(".faiss"):
                    if db is None:
                        db = FAISS.load_local(base_path, self.embedding, file.split('.')[0], allow_dangerous_deserialization=True)
                    else:
                        temp_db = FAISS.load_local(base_path, self.embedding, file.split('.')[0], allow_dangerous_deserialization=True)
                        db.merge_from(temp_db)
            self.retriever = db.as_retriever(
                search_type="similarity_score_threshold", 
                search_kwargs={
                    "k": 4,
                    "score_threshold": 0.2
                })
        else:
            self.retriever = None

    def retrieve_documents(self, course, question):
        if not self.course or self.course != course:
            self.course = course
            self.load_vectorstore()
        if not self.retriever:
            return []
        return self.retriever.invoke(question)