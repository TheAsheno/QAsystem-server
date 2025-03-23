from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.graphs import Neo4jGraph
from neo4j import GraphDatabase
import os

class RAG:
    def __init__(self, llm_params, embedding_model, uri, user, password):
        self.llm = ChatOpenAI(**llm_params)
        self.course = None
        self.retriever = None
        self.chain = None
        self.embedding = HuggingFaceEmbeddings(model_name=embedding_model)
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def initial_rag(self):
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
            template = """
            【指令】根据已知信息，简洁和专业的来回答问题。如果无法从中得到答案，请说 “根据已知信息无法回答该问题”，不允许在答案中添加编造成分，答案请使用中文，确保回答准确、完整。
            【已知信息】
            {context}

            【问题】
            {question}
            """
        else:
            self.retriever = None
            template = """
            【指令】答案请使用中文，确保回答准确、完整。
            【问题】
            {question}
            """
        prompt = ChatPromptTemplate.from_template(template)
        self.chain = prompt | self.llm | StrOutputParser()

    def combine_documents(self, docs):
        combined_docs = []
        for i, doc in enumerate(docs):
            combined_content = f"Document {i+1}:\n"
            combined_content += f"Content:\n{doc.page_content}\n"
            combined_content += "Metadata:\n"
            for key, value in doc.metadata.items():
                combined_content += f"{key}: {value}\n"
            combined_docs.append(combined_content.strip())
        return "\n\n".join(combined_docs)
    
    def query_neo4j(self, question):
        with self.driver.session() as session:
            result = session.run("MATCH (n) WHERE n.name CONTAINS $question RETURN n", question=question)
            nodes = result.data()
            return nodes