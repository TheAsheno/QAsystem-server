from langchain_community.embeddings import HuggingFaceEmbeddings

class SharedModel:
    _embedding_instance = None

    @staticmethod
    def get_embedding_model(model_name="bge-large-zh-v1.5"):
        if SharedModel._embedding_instance is None:
            SharedModel._embedding_instance = HuggingFaceEmbeddings(model_name=model_name)
        return SharedModel._embedding_instance