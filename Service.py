from flask import Flask, request, jsonify
from flask_cors import CORS
from RAG import RAG
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
api_url = os.getenv("OPENAI_API_URL")
uri = os.getenv("NEO4J_URI")
username = os.getenv("NEO4J_USERNAME")
password = os.getenv("NEO4J_PASSWORD")
sql_port = os.getenv("SQL_PORT")
model = "deepseek-chat"
llm_params = {
    "model": model,
    "openai_api_key": api_key,
    "openai_api_base": api_url,
    "max_tokens": 1024
}
embedding_model = "bge-large-zh-v1.5"

rag = RAG(llm_params, embedding_model, uri, username, password, sql_port)

app = Flask(__name__)
CORS(app)

@app.route("/ask", methods=["POST"])
def ask():
    data = request.json
    course = data.get("course")
    question = data.get("question")
    if not question:
        return jsonify({"error": "Question is required"}), 400
    try:
        result, kb_context, kg_context, related_questions = rag.answer_question(course, question)
        return jsonify({
            "content": result,
            "kb_context": kb_context,
            "kg_context": kg_context,
            "related_questions": related_questions
        })
    except Exception as e:
        print(f"处理请求时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
app.run(host="0.0.0.0", port=7000, debug=True)




