from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from KnowledgeBase import KnowledgeBase
from KnowledgeGraph import KnowledgeGraph
from QuestionBase import QuestionBase
from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict

class State(TypedDict):
    question: str
    course: str
    graph: list[str]
    kb_context: str
    kg_context: str
    related_questions: list[dict]
    response: str
class RAG:
    def __init__(self, llm_params, uri, user, password, sql_port):
        self.llm = ChatOpenAI(**llm_params)
        template = """
        【指令】请根据以下优先级回答问题：
        1. 优先使用知识库和知识图谱中的信息进行回答
        2. 可结合相似问题中讨论区的解决思路进行推理
        3. 当且仅当前两者均无法提供有效信息时，允许自主生成回答

        【回答规范】
        1. 回答简要明了，引用来源只需在最后进行说明，具体到哪条document或者哪个问题
        2. 自主生成的回答需声明无可靠知识依据
        3. 禁止虚构或编造未经验证的信息

        【已知信息】
        【知识库】
        {kb_context}

        【知识图谱】
        {kg_context}

        【相似问题】
        {related_questions}

        【问题】
        {question}
        """
        prompt = ChatPromptTemplate.from_template(template)
        self.chain = prompt | self.llm | StrOutputParser()
        self.knowledge_base = KnowledgeBase()
        self.knowledge_graph = KnowledgeGraph(uri, user, password)
        self.question_base = QuestionBase(sql_port)
        self.graph = self._initialize_langgraph()
        
    def _initialize_langgraph(self):
        graph_builder = StateGraph(State)
        graph_builder.add_node("retrieve_knowledge_base", self.retrieve_knowledge_base)
        graph_builder.add_node("retrieve_knowledge_graph", self.retrieve_knowledge_graph)
        graph_builder.add_node("retrieve_question_base", self.retrieve_question_base)
        graph_builder.add_node("generate_answer", self.generate_answer)
        graph_builder.add_edge(START, "retrieve_question_base")
        graph_builder.add_edge(START, "retrieve_knowledge_base")
        graph_builder.add_edge(START, "retrieve_knowledge_graph")
        graph_builder.add_edge("retrieve_question_base", "generate_answer")
        graph_builder.add_edge("retrieve_knowledge_base", "generate_answer")
        graph_builder.add_edge("retrieve_knowledge_graph", "generate_answer")
        graph_builder.add_edge("generate_answer", END)
        return graph_builder.compile()
    
    def retrieve_knowledge_base(self, state: State):
        docs = self.knowledge_base.retrieve_documents(state["course"], state["question"])
        return {"kb_context": self.combine_documents(docs) if docs else "无相关文档"} 

    def retrieve_knowledge_graph(self, state: State):
        graph_data = self.knowledge_graph.structured_retriever(state["question"])
        return {"kg_context": self.combine_graph_data(graph_data) if graph_data else "无相关图谱", "graph": graph_data if graph_data else {}}
    
    def retrieve_question_base(self, state: State):
        related_questions = self.question_base.search(state["course"], state["question"])
        return {"related_questions": related_questions if related_questions else []}

    def generate_answer(self, state: State):
        response = self.chain.invoke({"question": state["question"], "kb_context": state["kb_context"], "related_questions": state["related_questions"], "kg_context": state["kg_context"]})
        return {"response": response}

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

    def combine_graph_data(self, graph_data):
        nodes = graph_data["nodes"]
        links = graph_data["links"]
        id_to_node = {node["knowledgeId"]: node for node in nodes}
        combined_graph = []
        for link in links:
            source_id = link["source"]
            target_id = link["target"]
            source_node = id_to_node.get(source_id)
            target_node = id_to_node.get(target_id)
            if source_node and target_node:
                source = {"name": source_node.get("name"), "definite": source_node.get("definition", "未知")}
                target = {"name": target_node.get("name"), "definite": target_node.get("definition", "未知")}
                combined_graph.append(f"{source} --> {target}")
        return "\n".join(combined_graph)

    def answer_question(self, course, question):
        result = self.graph.invoke({"question": question, "course": course})
        return result["response"], result["kb_context"], result["graph"], result["related_questions"]