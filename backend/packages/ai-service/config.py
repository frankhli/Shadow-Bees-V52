"""
AI Service 配置
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    
    # OpenAI 配置
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4"
    
    # 阿里云 DashScope (通义千问)
    dashscope_api_key: str = ""
    
    # 服务配置
    port: int = 5000
    log_level: str = "info"
    
    # 功能开关
    enable_pricing_ai: bool = True
    enable_content_generation: bool = True
    enable_content_review: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
