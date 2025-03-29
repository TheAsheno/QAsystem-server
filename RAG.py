from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from KnowledgeBase import KnowledgeBase
from KnowledgeGraph import KnowledgeGraph

class RAG:
    def __init__(self, llm_params, embedding_model, uri, user, password):
        self.llm = ChatOpenAI(**llm_params)
        self.course = None
        self.chain = None
        self.knowledge_base = KnowledgeBase(embedding_model)
        self.knowledge_graph = KnowledgeGraph(uri, user, password)
        self.initialize()

    def initialize(self):
        template = """
        【指令】根据已知信息，简洁和专业的来回答问题。如果无法从中得到答案，请说 “根据已知信息无法回答该问题”，不允许在答案中添加编造成分，答案请使用中文，确保回答准确、完整。
        【已知信息】
        {context}

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

    def answer_question(self, course, question):
        docs = self.knowledge_base.retrieve_documents(course, question)
        entities = ['自动机', '词法分析']
        graph_data = self.knowledge_graph.structured_retriever(entities)
        if graph_data:
            print(graph_data)
        context = self.combine_documents(docs) if docs else ""
        result = self.chain.invoke({
            "question": question,
            "context": context
        })
        return result, context