// Versión reducida de Plotly: solo incluye el núcleo y los dos tipos de
// gráfico que usa el mapa mundial (choropleth de países + puntos de ciudad).
// El paquete completo de plotly.js pesa ~7-8MB porque incluye gráficos 3D,
// mapas GL, velas, sankey, etc. que esta app no usa; esto reduce
// drásticamente lo que hay que descargar y compilar, y el mapa carga mucho más rápido.
import Plotly from "plotly.js/lib/core";
import choropleth from "plotly.js/lib/choropleth";
import scattergeo from "plotly.js/lib/scattergeo";
import createPlotComponent from "react-plotly.js/factory";

Plotly.register([choropleth, scattergeo]);

export default createPlotComponent(Plotly);
