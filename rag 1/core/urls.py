from django.urls import path
from . import views

urlpatterns = [
	path("", views.index, name="index"),
	path("upload/", views.upload_document, name="upload_document"),
	path("documents/", views.list_documents, name="list_documents"),
	path("documents/<int:doc_id>/delete/", views.delete_document, name="delete_document"),
	path("chat/", views.chat, name="chat"),
]
