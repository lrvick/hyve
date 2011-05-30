self.addEventListener("connect", function (e) {
    var port = e.ports[0];
    var data = e.data
    port.addEventListener("message", function (e) {
        port.postMessage(e.data);
    }, false);
    port.start();
}, false);
