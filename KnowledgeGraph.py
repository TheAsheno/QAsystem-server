from neo4j import GraphDatabase
from langchain_community.graphs import Neo4jGraph
import re

class KnowledgeGraph:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.graph = Neo4jGraph(url=uri, username=user, password=password)

    def remove_lucene_chars(self, input):
        return re.sub(r'[+\-&|!(){}[\]^"~*?:\\/]', ' ', input)
        
    def generate_full_text_query(self, input):
        full_text_query = ""
        words = [el for el in self.remove_lucene_chars(input).split() if el]
        for word in words[:-1]:
            full_text_query += f" {word}~2 AND"
        full_text_query += f" {words[-1]}~2"
        return full_text_query.strip()

    def structured_retriever(self, entities, hops=1):
        result = []
        for entity in entities:
            response = self.graph.query(
                """
                CALL db.index.fulltext.queryNodes('entity', $query, {limit:2})
                YIELD node, score
                CALL {
                    WITH node
                    MATCH (node)-[r*1..$hops]->(neighbor)
                    RETURN node AS current_node, r AS relationship, neighbor AS neighbor_node
                    UNION ALL
                    WITH node
                    MATCH (node)<-[r*1..$hops]-(neighbor)
                    RETURN neighbor AS current_node, r AS relationship, node AS neighbor_node
                }
                RETURN current_node, relationship, neighbor_node
                """,
                {"query": self.generate_full_text_query(entity)},
            )
            if response:
                for record in response:
                    result.append({
                        "current_node": record["current_node"],
                        "relationship": record["relationship"],
                        "neighbor_node": record["neighbor_node"]
                    })
        return result

    def close(self):
        self.driver.close()

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

    kg.close()