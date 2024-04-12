import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom/cjs/react-router-dom.min";
const SAVE_INTERVAL_MS = 5000;
const TOOLBAR_OPTIONS = [
     [{ header: [1, 2, 3, 4, 5, 6, false] }],
     [{ font: [] }],
     [{ list: "ordered" }, { list: "bullet" }],
     ["bold", "italic", "underline"],
     [{ color: [] }, { background: [] }],
     [{ script: "sub" }, { script: "super" }],
     [{ align: [] }],
     ["image", "blockquote", "code-block"],
     ["clean"],
];
export default function TextEditor() {
     const [socket, setSocket] = useState();
     const [quill, setQuill] = useState();
     const { id: documentId } = useParams();
     useEffect(() => {
          const s = io("http://localhost:3001");
          setSocket(s);

          return () => {
               s.disconnect();
          };
     }, []);

     // S:load-document,get-document
     useEffect(() => {
          if (socket == null || quill == null) return;

          socket.once("load-document", (documents) => {
               console.log(documents);
               quill.setContents(documents);
               quill.enable();
          });
          socket.emit("get-document", documentId);
     }, [quill, socket, documentId]);

     // S:save-content
     useEffect(() => {
          if (socket == null || quill == null) return;

          const interval = setInterval(() => {
               socket.emit("save-content", quill.getContents());
               // console.log(quill.getContents().ops[0].insert);
               // console.log("new insert");

               return () => {
                    clearInterval(interval);
               };
          }, 3000);
     }, [quill, socket]);

     // S:send-changes > delta , Q:text-change > delta
     useEffect(() => {
          if (socket == null || quill == null) return;
          const handler = (delta, oldDelta, source) => {
               if (source !== "user") return;
               socket.emit("send-changes", delta);
          };

          quill.on("text-change", handler);
          return () => quill.off("text-change", handler);
     }, [quill, socket]);

     // S:receive-changes
     useEffect(() => {
          if (socket == null || quill == null) return;
          const handler = (delta) => {
               quill.updateContents(delta);
          };

          socket.on("receive-changes", handler);
          return () => socket.off("receive-changes", handler);
     }, [quill, socket]);

     const wrapperRef = useCallback((wrapper) => {
          if (wrapper == null) return;
          wrapper.innerHTML = "";
          const editor = document.createElement("div");
          wrapper.append(editor);
          const q = new Quill(editor, {
               theme: "snow",
               modules: { toolbar: TOOLBAR_OPTIONS },
          });
          q.disable();
          q.setText("loading...");
          setQuill(q);
     }, []);
     return <div className="container" ref={wrapperRef}></div>;
}
