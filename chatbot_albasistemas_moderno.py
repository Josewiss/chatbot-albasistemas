
import streamlit as st
import pandas as pd
import datetime

st.set_page_config(page_title="Chatbot Albasistemas", page_icon="🤖", layout="centered")
st.title("🤖 Chatbot Albasistemas")
st.markdown("Consulta precios, estados de pedidos, disponibilidad y más.")

# Simulación de base de datos
pedidos = pd.DataFrame([
    {"Cliente": "Alubal", "Material": "Hierro", "Espesor": 5, "Medidas": "2000x1000", "Precio": 94.20, "Estado": "En preparación", "Fecha": "2025-06-01"},
    {"Cliente": "Metálicas Lozano", "Material": "Hierro", "Espesor": 10, "Medidas": "3000x1500", "Precio": 282.00, "Estado": "Disponible", "Fecha": "2025-06-03"},
    {"Cliente": "Aceros Albacete", "Material": "Inoxidable", "Espesor": 3, "Medidas": "1500x1000", "Precio": 79.30, "Estado": "Enviado", "Fecha": "2025-05-30"},
    {"Cliente": "Estructuras Hermanos Pérez", "Material": "Hierro", "Espesor": 8, "Medidas": "3000x1500", "Precio": 215.00, "Estado": "Entregado", "Fecha": "2025-05-25"},
])

# Entradas estructuradas
cliente = st.selectbox("Selecciona el cliente", pedidos["Cliente"].unique())
consulta_tipo = st.radio("Tipo de consulta", ["Precio", "Estado del pedido", "Detalles del pedido"])

# Filtrar datos
pedido_cliente = pedidos[pedidos["Cliente"] == cliente].iloc[0]

if consulta_tipo == "Precio":
    st.success(f"💰 El precio del pedido de {cliente} es: {pedido_cliente['Precio']:.2f} €.")
elif consulta_tipo == "Estado del pedido":
    st.info(f"📦 Estado actual: {pedido_cliente['Estado']} (Pedido del {pedido_cliente['Fecha']})")
elif consulta_tipo == "Detalles del pedido":
    st.write("🧾 **Detalles del pedido:**")
    st.write(f"- Material: {pedido_cliente['Material']}")
    st.write(f"- Espesor: {pedido_cliente['Espesor']} mm")
    st.write(f"- Medidas: {pedido_cliente['Medidas']}")
    st.write(f"- Estado: {pedido_cliente['Estado']}")
    st.write(f"- Fecha de pedido: {pedido_cliente['Fecha']}")
    st.write(f"- Precio: {pedido_cliente['Precio']:.2f} €")

st.markdown("---")
st.caption("Demo moderna para Albasistemas. Desarrollado por ChatGPT.")
