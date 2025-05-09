from sklearn.metrics.pairwise import cosine_similarity
from Model import SharedModel
import requests

class Glossary:
    def __init__(self):
        self.embedding = SharedModel.get_embedding_model()

    def extract_entities(self, course, question, threshold=0.6, top_k=4):
        question_embedding = self.embedding.embed_query(question)
        similarities = cosine_similarity([question_embedding], self.term_embeddings)[0]
        top_indices = similarities.argsort()[-top_k:][::-1]
        entities = []
        for idx in top_indices:
            if similarities[idx] >= threshold:
                term = self.TERMS[idx]
                entities.append({"id": term["id"], "name": term["name"]})
        return entities