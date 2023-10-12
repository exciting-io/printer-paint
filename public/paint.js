function setupPaint() {
  // Bind canvas to listeners
  // console.log("setting up paint");
  const canvas = document.getElementById('imageView');
  if (canvas === null) {
    return;
  }

  canvas.addEventListener('mousedown', mouseDown, false);
  canvas.addEventListener('mousemove', mouseMove, false);
  canvas.addEventListener('mouseup', mouseUp, false);
  canvas.addEventListener('touchstart', touchStart, false);
  canvas.addEventListener('touchmove', touchMove, false);
  canvas.addEventListener('touchend', touchEnd, false);
  document.body.addEventListener('touchstart', stopTouchEventOnCanvasFromScrollingPage, false);
  document.body.addEventListener('touchmove', stopTouchEventOnCanvasFromScrollingPage, false);
  document.body.addEventListener('touchend', stopTouchEventOnCanvasFromScrollingPage, false);
  const ctx = canvas.getContext('2d');

  // create an in-memory canvas
  const memCanvas = document.createElement('canvas');
  memCanvas.width = canvas.width;
  memCanvas.height = canvas.height;
  const memCtx = memCanvas.getContext('2d');
  const points = [];

  const pencilControl = document.getElementById('pencil')
  const brushControl = document.getElementById('brush')
  const eraserControl = document.getElementById('eraser')
  const smallControl = document.getElementById('small')
  const mediumControl = document.getElementById('medium')
  const largeControl = document.getElementById('large')
  const undoControl = document.getElementById('undo')
  const redoControl = document.getElementById('redo')

  pencilControl.addEventListener('click', usePencil, false);
  brushControl.addEventListener('click', useBrush, false);
  eraserControl.addEventListener('click', useEraser, false);
  smallControl.addEventListener('click', changeStrokeWidth, false);
  mediumControl.addEventListener('click', changeStrokeWidth, false);
  largeControl.addEventListener('click', changeStrokeWidth, false);
  undoControl.addEventListener('click', function() {
    history.undo();
  }, false);
  redoControl.addEventListener('click', function() {
    history.redo();
  }, false);

  var baseStrokeWidth = 2;
  var brushEnabled = false;
  ctx.lineWidth = baseStrokeWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  var started = false;

  const mouseCircle = document.getElementById('mouseCircle');

  function usePencil() {
    brushEnabled = false;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    pencilControl.classList.add('selected')
    brushControl.classList.remove('selected')
    eraserControl.classList.remove('selected')
  }

  function useEraser() {
    brushEnabled = false;
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';
    pencilControl.classList.remove('selected')
    brushControl.classList.remove('selected')
    eraserControl.classList.add('selected')
  }

  function useBrush() {
    brushEnabled = true;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    pencilControl.classList.remove('selected')
    brushControl.classList.add('selected')
    eraserControl.classList.remove('selected')
  }

  function changeStrokeWidth(e) {
    let target = e.target;
    if (target.tagName === 'svg') {
      target = target.parentNode;
    } else if (target.tagName === 'circle') {
      target = target.parentNode.parentNode;
    }

    smallControl.classList.remove('selected')
    mediumControl.classList.remove('selected')
    largeControl.classList.remove('selected')
    target.classList.add('selected')

    baseStrokeWidth = target.dataset.width;
    mouseCircle.style.width = target.dataset.width + 'px';
    mouseCircle.style.height = target.dataset.width + 'px';
    mouseCircle.style.marginLeft = ((-target.dataset.width / 2) - 1.5) + 'px';
    mouseCircle.style.marginTop = ((-target.dataset.width / 2) - 1) + 'px';
  }

  function mouseDown(e) {
    var m = getMouse(e, canvas);
    points.push({
      x: m.x,
      y: m.y
    });
    started = true;
    history.saveState();
  };

  function mouseMove(e) {
    mouseCircle.style.left = e.pageX + 'px';
    mouseCircle.style.top = e.pageY + 'px';

    if (started) {
      ctx.clearRect(0, 0, canvas.height, canvas.width);
      // put back the saved content
      ctx.drawImage(memCanvas, 0, 0);
      var m = getMouse(e, canvas);
      points.push({
        x: m.x,
        y: m.y,
        timestamp: Date.now()
      });

      drawPoints(ctx, points);
    }
  };

  function mouseUp(e) {
    if (started) {
      started = false;

      // if the mouse didn't move between mousedown and mouseup, draw a point
      if (points.length == 1) {
        drawCircle(ctx, points[0]);
      }

      // When the pen is done, save the resulting context
      // to the in-memory canvas
      memCtx.clearRect(0, 0, canvas.height, canvas.width);
      memCtx.drawImage(canvas, 0, 0);

      points.length = 0;
    }
  };

  function touchStart(e) { dispatchMouseEventFromTouchEvent(e, "mousedown") };
  function touchEnd(e) { dispatchMouseEventFromTouchEvent(e, "mouseup") };
  function touchMove(e) { dispatchMouseEventFromTouchEvent(e, "mousemove") };

  function dispatchMouseEventFromTouchEvent(e, mouseEventType) {
    if (mouseEventType === "mouseup") {
      var options = {};
    } else {
      var options = {
        clientX: e.touches[0].pageX,
        clientY: e.touches[0].pageY
      };
    }
    canvas.dispatchEvent(new MouseEvent(mouseEventType, options));
  }

  function stopTouchEventOnCanvasFromScrollingPage(e) {
    if (e.target === canvas) {
      e.preventDefault();
    }
  }

  function drawPoints(ctx, points) {
    // draw a basic circle instead
    if (points.length < 6) {
      drawCircle(ctx, points[0]);
      return
    }
    ctx.beginPath(), ctx.moveTo(points[0].x, points[0].y);
    // draw a bunch of quadratics, using the average of two points as the control point
    for (i = 1; i < points.length - 2; i++) {
      var c = (points[i].x + points[i + 1].x) / 2,
          d = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, c, d)
      if (brushEnabled) {
        var time = points[i+1].timestamp - points[i].timestamp;
        var distance = Math.sqrt(
          Math.pow(Math.abs(points[i+1].x - points[i].x), 2) +
            Math.pow(Math.abs(points[i+1].y - points[i].y), 2)
        )
        ctx.lineWidth = baseStrokeWidth - ((distance * 5 + 1) / time)
        ctx.stroke()
      } else {
        ctx.lineWidth = baseStrokeWidth
      }
    }
    ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y), ctx.stroke()
  }

  function drawCircle(ctx, point) {
    ctx.beginPath(), ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0), ctx.closePath(), ctx.fill();
  }

  function getMouse(e, canvas) {
    var element = canvas, offsetX = 0, offsetY = 0, mx, my;

    // Compute the total offset. It's possible to cache this if you want
    if (element.offsetParent !== undefined) {
      do {
        offsetX += element.offsetLeft;
        offsetY += element.offsetTop;
      } while ((element = element.offsetParent));
    }

    const scaledWidth = canvas.width / canvas.offsetWidth;
    const scaledHeight = canvas.height / canvas.offsetHeight;

    mx = (e.pageX - offsetX) * scaledWidth;
    my = (e.pageY - offsetY) * scaledHeight;

    // We return a simple javascript object with x and y defined
    return {x: mx, y: my};
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.height, canvas.width);
    memCtx.clearRect(0, 0, canvas.height, canvas.width);
  };

  var history = {
    redo_list: [],
    undo_list: [],
    saveState: function(list, keep_redo) {
      keep_redo = keep_redo || false;
      if(!keep_redo) {
        this.redo_list = [];
      }

      (list || this.undo_list).push(canvas.toDataURL());
    },
    undo: function() {
      this.restoreState(this.undo_list, this.redo_list);
    },
    redo: function() {
      this.restoreState(this.redo_list, this.undo_list);
    },
    restoreState: function(pop, push) {
      if (pop.length) {
        this.saveState(push, true);
        var restore_state = pop.pop();
        var img = new Image(canvas.width, canvas.height);
        img.src = restore_state;
        img.onload = function() {
          clear();
          ctx.drawImage(img, 0, 0);
          memCtx.drawImage(img, 0, 0);
        }
      }
    }
  };

  // put the blank canvas into the undo list so the first stroke can be
  // undone
  history.saveState();
};

document.addEventListener('DOMContentLoaded', setupPaint);
document.addEventListener('turbo:load', setupPaint);



// /* Totally stolen from the tutorial here: http://dev.opera.com/articles/view/html5-canvas-painting/ */
// // Keep everything in anonymous function, called on window load.
// if(window.addEventListener) {
// window.addEventListener('load', function () {
//   var canvas, context, canvaso, contexto;

//   // The active tool instance.
//   var tool;
//   var strokeColor = "#000000";
//   var strokeWidth = 1;

//   function init () {
//     // Find the canvas element.
//     canvaso = document.getElementById('imageView');
//     if (!canvaso) {
//       alert('Error: I cannot find the canvas element!');
//       return;
//     }

//     if (!canvaso.getContext) {
//       alert('Error: no canvas.getContext!');
//       return;
//     }

//     // Get the 2D canvas context.
//     contexto = canvaso.getContext('2d');
//     if (!contexto) {
//       alert('Error: failed to getContext!');
//       return;
//     }

//     // Add the temporary canvas.
//     var container = canvaso.parentNode;
//     canvas = document.createElement('canvas');
//     if (!canvas) {
//       alert('Error: I cannot create a new canvas element!');
//       return;
//     }

//     canvas.id     = 'imageTemp';
//     canvas.width  = canvaso.width;
//     canvas.height = canvaso.height;
//     container.appendChild(canvas);

//     context = canvas.getContext('2d');

//     tool = new tools.pencil();


//     document.getElementById('pencil').addEventListener('click', ev_tool_change, false);
//     document.getElementById('eraser').addEventListener('click', ev_tool_change, false);
//     document.getElementById('small').addEventListener('click', ev_width_change, false);
//     document.getElementById('medium').addEventListener('click', ev_width_change, false);
//     document.getElementById('large').addEventListener('click', ev_width_change, false);

//     // Attach the mousedown, mousemove and mouseup event listeners.
//     canvas.addEventListener('mousedown', ev_canvas, false);
//     canvas.addEventListener('mousemove', ev_canvas, false);
//     canvas.addEventListener('mouseup',   ev_canvas, false);
//   }

//   // The general-purpose event handler. This function just determines the mouse
//   // position relative to the canvas element.
//   function ev_canvas (ev) {
//     if (ev.layerX || ev.layerX == 0) { // Firefox
//       ev._x = ev.layerX;
//       ev._y = ev.layerY;
//     } else if (ev.offsetX || ev.offsetX == 0) { // Opera
//       ev._x = ev.offsetX;
//       ev._y = ev.offsetY;
//     }

//     // Call the event handler of the tool.
//     var func = tool[ev.type];
//     if (func) {
//       func(ev);
//     }
//   }

//   // The event handler for any changes made to the tool selector.
//   function ev_tool_change (ev) {
//     const toolname = this.id;
//     if (tools[toolname]) {
//       tool = new tools[toolname]();
//       canvas.style.cursor = tool.cursor;
//     }
//   }

//   // The event handler for any changes made to the tool selector.
//   function ev_width_change (ev) {
//     switch (this.id) {
//       case "small":
//         strokeWidth = 1;
//         break;
//       case "medium":
//         strokeWidth = 5;
//         break;
//       case "large":
//         strokeWidth = 10;
//         break;
//     }
//   }

//   // This function draws the #imageTemp canvas on top of #imageView, after which
//   // #imageTemp is cleared. This function is called each time when the user
//   // completes a drawing operation.
//   function img_update () {
// 		contexto.drawImage(canvas, 0, 0);
// 		context.clearRect(0, 0, canvas.width, canvas.height);
//   }

//   // This object holds the implementation of each drawing tool.
//   var tools = {};

//   // The drawing pencil.
//   tools.pencil = function () {
//     var tool = this;
//     this.started = false;

//     this.cursor = "url('/pencil.gif') 3 30, auto";

//     // This is called when you start holding down the mouse button.
//     // This starts the pencil drawing.
//     this.mousedown = function (ev) {
//         context.beginPath();
//         context.moveTo(ev._x, ev._y);
//         context.strokeStyle = "#000000";
//         context.lineWidth = strokeWidth;
//         tool.started = true;
//     };

//     // This function is called every time you move the mouse. Obviously, it only
//     // draws if the tool.started state is set to true (when you are holding down
//     // the mouse button).
//     this.mousemove = function (ev) {
//       if (tool.started) {
//         context.lineTo(ev._x, ev._y);
//         context.stroke();
//       }
//     };

//     // This is called when you release the mouse button.
//     this.mouseup = function (ev) {
//       if (tool.started) {
//         tool.mousemove(ev);
//         tool.started = false;
//         img_update();
//       }
//     };
//   };

//   tools.eraser = function () {
//     var tool = this;
//     this.started = false;

//     this.cursor = "url('/eraser.gif') 6 30, auto";

//     // This is called when you start holding down the mouse button.
//     // This starts the pencil drawing.
//     this.mousedown = function (ev) {
//         context.beginPath();
//         context.moveTo(ev._x, ev._y);
//         tool.started = true;
//         context.strokeStyle = "#FFFFFF";
//         context.lineWidth = strokeWidth * 2;
//     };

//     // This function is called every time you move the mouse. Obviously, it only
//     // draws if the tool.started state is set to true (when you are holding down
//     // the mouse button).
//     this.mousemove = function (ev) {
//       if (tool.started) {
//         context.lineTo(ev._x, ev._y);
//         context.stroke();
//       }
//     };

//     // This is called when you release the mouse button.
//     this.mouseup = function (ev) {
//       if (tool.started) {
//         tool.mousemove(ev);
//         tool.started = false;
//         img_update();
//       }
//     };
//   }

//   init();

// }, false); }
