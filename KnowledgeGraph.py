from neo4j import GraphDatabase

class KnowledgeGraph:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def query(self, question):
        """
        查询 Neo4j 图数据库
        """
        with self.driver.session() as session:
            result = session.run("MATCH (n) WHERE n.name CONTAINS $question RETURN n", question=question)
            nodes = result.data()
            return nodes

    def close(self):
        """
        关闭数据库连接
        """
        self.driver.close()