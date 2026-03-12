# PadelScore – Marcador de Pádel con botón Flic

Aplicación web diseñada para mostrar el marcador de un partido de pádel en un móvil o pantalla de pista, permitiendo registrar los puntos mediante un botón físico Flic o mediante control manual.

El objetivo es poder anotar puntos durante el partido sin tener que interactuar con el móvil.

---

# Objetivo del proyecto

Crear un marcador visual claro para pista de pádel que permita:

- Registrar puntos con un botón Flic
- Mostrar el marcador en una pantalla o móvil
- Escuchar el marcador con locución automática
- Mantener una interfaz simple y visible desde la pista

---

# Características actuales

Marcador completo de pádel:

- puntos: 0, 15, 30, 40
- ventaja
- punto de oro configurable
- juegos
- sets
- mejor de 3 sets

Indicador visual de servicio:

- marco dorado alrededor de la pareja que saca
- etiqueta SERVICIO

Pantalla optimizada para pista:

- números de puntos muy grandes
- panel central con juegos y sets
- botón de deshacer en la parte inferior

Cronómetro del partido

Lectura por voz del marcador utilizando Web Speech API.

Ejemplos de locuciones:

- "Quince nada"
- "Treinta iguales"
- "Ventaja servicio"
- "Juego para..."
- "Juego, set y partido para..."

---

# Control mediante botón Flic

El sistema está preparado para funcionar con el botón Flic.

Configuración prevista:

1 clic  
→ punto para pareja izquierda

2 clics  
→ punto para pareja derecha

pulsación larga  
→ deshacer último punto

El botón envía una URL que ejecuta la acción correspondiente en la aplicación.

---

# Modos de uso

Modo visualización

Pantalla principal para mostrar el marcador durante el partido.

Diseñada para colocarse en:

- un móvil
- una tablet
- una pantalla en la pista

Modo control

Permite:

- sumar puntos manualmente
- generar las URL necesarias para el botón Flic
- probar el sistema de audio

---

# Tecnologías utilizadas

React  
Vite  
CSS personalizado  
Web Speech API  
LocalStorage para persistencia del partido

Deploy automático en:

Vercel

Repositorio en:

GitHub

---

# Instalación local

Clonar el repositorio:

git clone https://github.com/AGPadel/click-flic.git

Entrar en la carpeta del proyecto:

cd click-flic

Instalar dependencias:

npm install

Iniciar servidor local:

npm run dev

---

# Deploy

El proyecto está configurado para desplegar automáticamente en Vercel al hacer push en GitHub.

---

# Próximas mejoras

- sincronización en tiempo real entre móviles
- integración directa con botón Flic
- marcador para varias pistas
- personalización de colores
- marcador tipo videowall
- mejoras en la locución del marcador

---

# Autor

Proyecto desarrollado para uso en pista de pádel.

AGPadel