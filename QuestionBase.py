from sklearn.metrics.pairwise import cosine_similarity
from Model import SharedModel
import requests

class QuestionBase:
    def __init__(self, sql_port):
        self.sql_url = f"http://localhost:{sql_port}"
        self.embedding = SharedModel.get_embedding_model()

    def search(self, course_id, question_text):
        related_questions = self.get_related_questions(course_id, question_text)
        for question in related_questions:
            question["teacher_replies"] = self.get_teacher_replies(question["questionid"])
        return related_questions

    def get_related_questions(self, course_id, question_text):
        api_url = self.sql_url + "/api/questions"
        params = {
            "courseIds": [course_id],
            "status": "locked"
        }
        try:
            response = requests.get(api_url, params=params)
            response.raise_for_status()
            questions = response.json()
            current_embedding = self.embedding.embed_query(question_text)
            question_similarities = []
            for question in questions:
                combined_text = f"{question['title']} {question['content']}"
                question_embedding = self.embedding.embed_query(combined_text)
                similarity = cosine_similarity([current_embedding], [question_embedding])[0][0]
                question_similarities.append((question, similarity))
            sorted_questions = sorted(
                question_similarities, key=lambda x: x[1], reverse=True
            )[:3]
            return [
                {
                    "questionid": q["questionid"],
                    "title": q["title"],
                    "content": q["content"]
                }
                for q, sim in sorted_questions if sim > 0.5
            ]
        except requests.RequestException as e:
            print(f"Error fetching related questions: {e}")
            return []

    def get_teacher_replies(self, question_id):
        api_url = self.sql_url + "/api/replies"
        params = {
            "questionid": question_id
        }
        try:
            response = requests.get(api_url, params=params)
            response.raise_for_status()
            replies = response.json()
            teacher_replies = [
                reply["content"] for reply in replies if reply.get("role") == "teacher"
            ]
            return teacher_replies
        except requests.RequestException as e:
            print(f"Error fetching teacher replies: {e}")
            return []