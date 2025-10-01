from django.apps import AppConfig
import faiss  # noqa: F401


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
