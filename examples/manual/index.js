require('./otel');
const { events } = require('@opentelemetry/api-events');

const eventLogger = events.getEventLogger('my-logger', '123');

window.addEventListener('load', () => {
  const btn1 = document.getElementById('button1');
  btn1.addEventListener('click', makeXhrCall);

  const btn2 = document.getElementById('button2');
  btn2.addEventListener('click', generateCustomEvent);
});

function makeXhrCall() {
  const req = new XMLHttpRequest();
  req.addEventListener("load", function() {
  });
  req.open("GET", "https://httpbin.org/get");
  // req.open("GET", "http://localhost:3000");
  req.send();
}

function generateCustomEvent() {
  const logger = events.getEventLogger('custom-logger');
  logger.emit({
    name: 'my-event',
    data: {
      key1: 'val1'
    }
  });
}
