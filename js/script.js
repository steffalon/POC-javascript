window.addEventListener("load", function load(event) {
    //Setup varibles:
    const canvas = document.getElementById('canvas');
    const save = document.getElementById('save');
    const download = document.getElementById('download');
    const ctx = canvas.getContext('2d');
    const coordinate = canvas.getBoundingClientRect();
    const downloadFile = document.createElement('a');
    //Varibles that changes constantly
    let doDrawing, data;
    //Canvas size
    canvas.width = window.screen.availWidth / 2;
    canvas.height = window.screen.availHeight / 2;
    //White background
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    //Canvas events
    canvas.addEventListener('mousemove', (e) => {
        if (doDrawing === true) {
            ctx.lineTo(e.pageX - coordinate.left, e.pageY - coordinate.top);
            ctx.stroke();
        }
    });
    //Starts to draw! Prepairs to start drawing and will be combined with "mousemove" event.
    canvas.addEventListener('mousedown', (e) => {
        doDrawing = true;
        ctx.strokeStyle = document.getElementById('color').value; //color input value within html
        ctx.lineWidth = 1;
        ctx.beginPath();
    });
    //Don't draw any further if those events are triggerd
    canvas.addEventListener('mouseup', () => {
        doDrawing = false;
    });
    canvas.addEventListener('mouseout', () => {
        doDrawing = false;
    });
    //Button save (will be database save and returns a generated link in the future...)
    save.addEventListener('click', () => {
      data = canvas.toDataURL('image/jpeg', 1.0); //Save image in url base64 format
      document.getElementById('urlImage').innerHTML = data; //Test result
    });
    //Button to download file
    download.addEventListener('click', () => {
      data = canvas.toDataURL('image/jpeg;base64;').replace("image/jpeg", "image/octet-stream");
      downloadFile.href = data;
      downloadFile.download = data.substr(data.lastIndexOf('/') + 1);
      downloadFile.click();
    });
}, false);
