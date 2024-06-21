require('./otel');
const { events } = require('@opentelemetry/api-events');

window.addEventListener('load', () => {
  const btn1 = document.getElementById('button1');
  btn1.addEventListener('click', handleTest1Click);
});

function handleTest1Click() {
  makeXhrCall();
}

function makeXhrCall() {
  const req = new XMLHttpRequest();
  req.addEventListener("load", function() {
  });
  // req.open("GET", "https://httpbin.org/get");
  req.open("GET", "http://localhost:3000");
  req.send();
}
