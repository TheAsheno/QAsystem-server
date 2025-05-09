from langchain_community.graphs import Neo4jGraph
from Model import SharedModel
from sklearn.metrics.pairwise import cosine_similarity
class KnowledgeGraph:
    def __init__(self, uri, user, password):
        self.embedding = SharedModel.get_embedding_model() 
        self.graph = Neo4jGraph(url=uri, username=user, password=password)
        self.TERMS = self.load_glossary()
        self.term_embeddings = self.embedding.embed_documents([term["name"] for term in self.TERMS])

    def load_glossary(self):
        query = """MATCH (n) RETURN n.knowledgeId AS knowledgeId, n.name AS name"""
        response = self.graph.query(query)
        TERMS = []
        for record in response:
            TERMS.append({"knowledgeId": record["knowledgeId"], "name": record["name"]})
        return TERMS

    def structured_retriever(self, question, hops=1):
        entities = self.extract_entities(question)
        print(entities)
        nodes_map = {}
        links = []
        for entity in entities:
            out_response = self.graph.query(
                """
                MATCH (n {knowledgeId: $knowledgeId})-[r]->(neighbor)
                RETURN n AS source_node, neighbor AS target_node, r AS relationship
                """,
                {"knowledgeId": entity["knowledgeId"]},
            )
            in_response = self.graph.query(
                """
                MATCH (neighbor)-[r]->(n {knowledgeId: $knowledgeId})
                RETURN neighbor AS source_node, n AS target_node, r AS relationship
                """,
                {"knowledgeId": entity["knowledgeId"]},
            )
            all_response = out_response + in_response
            for record in all_response:
                source = record["source_node"]
                target = record["target_node"]
                if source["knowledgeId"] not in nodes_map:
                    nodes_map[source["knowledgeId"]] = source
                if target["knowledgeId"] not in nodes_map:
                    nodes_map[target["knowledgeId"]] = target
                links.append({
                    "source": source["knowledgeId"],
                    "target": target["knowledgeId"],
                })
        nodes = list(nodes_map.values())
        return {"nodes": nodes, "links": links}

    def extract_entities(self, question, threshold=0.6, top_k=4):
        question_embedding = self.embedding.embed_query(question)
        similarities = cosine_similarity([question_embedding], self.term_embeddings)[0]
        top_indices = similarities.argsort()[-top_k:][::-1]
        entities = []
        for idx in top_indices:
            if similarities[idx] >= threshold:
                term = self.TERMS[idx]
                entities.append({"knowledgeId": term["knowledgeId"], "name": term["name"]})
        return entities

if __name__ == "__main__":
    uri = "bolt://localhost:7687"
    user = "neo4j"
    password = "ytt252011"

    kg = KnowledgeGraph(uri, user, password)

    entities = ['自动机', '词法分析']
    structured_result = kg.structured_retriever(entities)
    for record in structured_result:
        print("Current Node:", record["current_node"])
        print("Relationship:", record["relationship"])
        print("Neighbor Node:", record["neighbor_node"])
        print("-" * 50)