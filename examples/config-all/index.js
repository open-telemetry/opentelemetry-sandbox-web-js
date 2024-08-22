import './otel';

window.addEventListener('load', () => {
  const btn1 = document.getElementById('button1');
  btn1.addEventListener('click', makeXhrCall);
});

function makeXhrCall() {
  const req = new XMLHttpRequest();
  req.addEventListener("load", function() {
  });
  // req.open("GET", "https://httpbin.org/get");
  req.open("GET", "http://localhost:3000");
  req.send();
}
