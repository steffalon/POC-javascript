window.addEventListener("load", function load(event) {
    //Get library
    const lzwCompress = window.lzwCompress;
    const Connection = new JsStore.Instance();
    //Setup varibles:
    const canvas = document.getElementById('canvas');
    const save = document.getElementById('save');
    const download = document.getElementById('download');
    const ctx = canvas.getContext('2d');
    const coordinate = canvas.getBoundingClientRect();
    const downloadFile = document.createElement('a');
    const url = new URL(window.location.href);
    const DbName ='imgData';
    //Varibles that changes constantly
    let doDrawing, data;
    //Canvas size
    canvas.width = window.screen.availWidth / 2;
    canvas.height = window.screen.availHeight / 2;
    //White background
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if (url.searchParams.get("data")) {
        JsStore.isDbExist(DbName,function(isExist){
            if(isExist) {
                Connection.openDb(DbName);
                Connection.select({
                    From: "imgTable",
                    Where:{
                        url:url.searchParams.get("data")
                    },
                    OnSuccess:function (results){
                        if (results[0] !== undefined) {
                            let Unparse = JSON.parse(results[0].data);
                            Unparse = lzwCompress.unpack(Unparse);
                            function drawDataURIOnCanvas(strDataURI, canvas) {
                                "use strict";
                                var img = new window.Image();
                                img.addEventListener("load", function () {
                                    canvas.getContext("2d").drawImage(img, 0, 0);
                                });
                                img.setAttribute("src", strDataURI);
                            }
                            drawDataURIOnCanvas(Unparse, canvas);
                        } else {
                            console.error("File not found..");
                        }
                    },
                    OnError:function (error) {
                        console.error("Something went wrong..")
                    }
                });
            } else {
                console.error("It seems you didn't save any drawings so far..");
            }
        });
    }
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
      dataCanvas = canvas.toDataURL('image/jpeg', 1.0); //Save image in url base64 format
      dataCanvas = lzwCompress.pack(dataCanvas); //Test result
        JsStore.isDbExist(DbName,function(isExist){
            if(isExist)
            {
                Connection.openDb(DbName);
                console.log('Db already created');
                database(Connection, dataCanvas);
            }
            else
            {
                console.log('Db does not exist - creating..');
                var table={
                    Name: 'imgTable',
                    Columns:[{
                        Name: 'data',
                        Unique: true,
                        DataType: 'string'
                },{
                        Name: 'url',
                        PrimaryKey: true,
                        Unique: true,
                        DataType: 'string'
                }]
                }
                var db = {
                    Name: DbName,
                    Tables: [table]
                }
                Connection.createDb(db,function(){
                    console.log('Db created successfully');
                    Connection.openDb(DbName);
                    database(Connection, dataCanvas);
                });
            }
        });
    });
    //Button to download file
    download.addEventListener('click', () => {
      data = canvas.toDataURL('image/jpeg;base64;').replace("image/jpeg", "image/octet-stream");
      downloadFile.href = data;
      downloadFile.download = data.substr(data.lastIndexOf('/') + 1);
      downloadFile.click();
    });
}, false);


function database(Connection, dataCanvas) {
    function randomString(length, chars) {
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }
    var urlData = randomString(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    var value={
        data:JSON.stringify(dataCanvas), 
        url:urlData
    }
    Connection.insert({
        Into: 'imgTable',
        Values: [value],//you can insert multiple values at a time
        OnSuccess:function (rowsAffected){
            if (rowsAffected > 0)
            {
                 console.info('Successfully Added');
            }
            },
                OnError:function (error) {
                console.dir(error);
        }
    });
    let showURL = document.getElementById("urlImage");
    let a = document.createElement("a");
    let url = new URL(window.location.href);
    let text = document.createTextNode(url + "?data=" + urlData);
    a.setAttribute('href', url + "?data=" + urlData);
    a.appendChild(text);
    showURL.appendChild(a);
}