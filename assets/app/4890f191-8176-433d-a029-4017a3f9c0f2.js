/* Fotos del app: cada una en su archivo de assets/app/fotos (tools/aligerar.js). */
window.SPACIO_FOTOS = {
  "assets/photos/bedroom.jpeg": "assets/app/fotos/bedroom.jpeg?v=123296e746",
  "assets/photos/kitchen.jpeg": "assets/app/fotos/kitchen.jpeg?v=da5cad80ad",
  "assets/photos/living.jpeg": "assets/app/fotos/living.jpeg?v=f791a3c78a",
  "assets/photos/morning.jpeg": "assets/app/fotos/morning.jpeg?v=d3b393da60",
  "assets/photos/nook.jpeg": "assets/app/fotos/nook.jpeg?v=ce2fbb1e48",
  "assets/photos/onb-bedroom.jpeg": "assets/app/fotos/onb-bedroom.jpeg?v=22c6289cf1",
  "assets/photos/onb-design.jpeg": "assets/app/fotos/onb-design.jpeg?v=ddbb94267b",
  "assets/photos/onb-living.jpeg": "assets/app/fotos/onb-living.jpeg?v=44aaa01db6",
  "assets/photos/pm-desk-web.jpeg": "assets/app/fotos/pm-desk-web.jpeg?v=1f636a1eb1",
  "assets/photos/rooftop.jpeg": "assets/app/fotos/rooftop.jpeg?v=be6bf96709",
  "assets/photos/welcome-table.jpeg": "assets/app/fotos/welcome-table.jpeg?v=cd97e29745",
};
window.F = function(p){ return (window.SPACIO_FOTOS && window.SPACIO_FOTOS[p]) || p; };
