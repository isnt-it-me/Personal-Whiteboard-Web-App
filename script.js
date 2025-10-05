window.addEventListener('load', () => {
    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    const toolbar = document.querySelector('.toolbar');
    const thicknessSlider = document.getElementById('thickness-slider');
    const colorPicker = document.getElementById('color-picker');
    const themeToggle = document.getElementById('theme-toggle');
    let isDrawing = false;
    let currentTool = 'pencil';
    let currentColor = '#E74C3C';
    let currentThickness = 5;
    let startX, startY;
    let boardImage; // holding canvas state for drawing shapes
    let history = []; //recording the images drawn
    let historyIndex = -1;

    function resizeCanvas() {
        const currentDrawing = history[historyIndex]; // grt the last valid state
        const container = document.querySelector('.canvas-container');
        canvas.width = container.offsetWidth - 40;
        canvas.height = container.offsetHeight - 40;
        if (currentDrawing) {
            redrawCanvas(currentDrawing);
        } else {

            setInitialCanvasBackground();
        }
    }


    function setInitialCanvasBackground() {
        ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /** 
     * redraws the canvas from a given history state (a base64 data URL).
     * @param {string} dataUrl - The canvas state to draw.
     */
    function redrawCanvas(dataUrl) {
        const img = new Image() ;
        img.src = dataUrl;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clearing before drawi ng
            ctx.drawImage(img, 0, 0);
        };
    }

    function startDrawing(event) {
        isDrawing = true;
        [startX, startY] = [event.offsetX, event.offsetY];

        // setting drawing properties
        ctx.beginPath();
        ctx.lineWidth = currentThickness;
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // saving a boardImage for shape drawing
        boardImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    function draw(event) {
        if (!isDrawing) return;

        // for shapes restoring the boardImage to only show the final preview
        if (currentTool !== 'pencil' && currentTool !== 'eraser') {
            ctx.putImageData(boardImage, 0, 0);
        }

        // using destination-out for a true eraser, source-over for drawing
        ctx.globalCompositeOperation = (currentTool === 'eraser') ? 'destination-out' : 'source-over';

        // tool-specific drawing logic
        if (currentTool === 'pencil' || currentTool === 'eraser') {
            ctx.lineTo(event.offsetX, event.offsetY);
            ctx.stroke();
        } else if (currentTool === 'rectangle') {
            ctx.strokeRect(startX, startY, event.offsetX - startX, event.offsetY - startY);
        } else if (currentTool === 'circle') {
            ctx.beginPath();
            let radius = Math.sqrt(Math.pow((startX - event.offsetX), 2) + Math.pow((startY - event.offsetY), 2));
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(event.offsetX, event.offsetY);
            ctx.stroke();
        }
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            saveState(); // saving the state after the drawing is complete
        }
    }

    function saveState() {
        // if we undo and then draw, we need to clear the "redo" history
        history = history.slice(0, historyIndex + 1);

        const dataUrl = canvas.toDataURL();
        history.push(dataUrl);
        historyIndex = history.length - 1;

        // persisting to local storage
        localStorage.setItem('whiteboardData', dataUrl);
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            redrawCanvas(history[historyIndex]);
            localStorage.setItem('whiteboardData', history[historyIndex]);
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            redrawCanvas(history[historyIndex]);
            localStorage.setItem('whiteboardData', history[historyIndex]);
        }
    }

    function initialize() {
        // settting theme from localStorage
        const savedTheme = localStorage.getItem('whiteboardTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }

        resizeCanvas(); // set initial canvas size

        // loadiing drawing from localStorage
        const savedData = localStorage.getItem('whiteboardData');
        if (savedData) {
            redrawCanvas(savedData);
            // setting the loaded state as the first history item
            history = [savedData];
            historyIndex = 0;
        } else {
            // if nothing saved data, setting the background and save the initial blank state
            setInitialCanvasBackground();
            saveState();
        }
    }

    initialize();

    // event listener for all toolbar buttons
    toolbar.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target) return;

        // tool selection
        if (target.dataset.tool) {
            document.querySelector('.tool-button.active').classList.remove('active');
            target.classList.add('active');
            currentTool = target.dataset.tool;
        }

        // color selection
        if (target.dataset.color) {
            if (document.querySelector('.color-button.active')) {
                document.querySelector('.color-button.active').classList.remove('active');
            }
            target.classList.add('active');
            currentColor = target.dataset.color;
        }

        // handlingg specific button Ids
        switch (target.id) {
            case 'color-picker-button':
                colorPicker.click();
                break;
            case 'clear-button':
                setInitialCanvasBackground(); // filled with background color
                saveState(); // saved the cleared state
                break;
            case 'save-button':
                const link = document.createElement('a');
                link.download = 'whiteboard.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                break;
            case 'undo-button':
                undo();
                break;
            case 'redo-button':
                redo();
                break;
            default:
                ;
        }
    });

    // canvas drawing listenerss
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw) ;
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing); // stop if mouse leaves canvas

    // other input listeners
    thicknessSlider.addEventListener('input', event => currentThickness = event.target.value);

    colorPicker.addEventListener('input', event => {
        currentColor = event.target.value;
        if (document.querySelector('.color-button.active')) {
            document.querySelector('.color-button.active').classList.remove('active');
        }
    }) ;

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('whiteboardTheme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        redrawCanvas(history[historyIndex]); // redrawing the canvas with the new background color

    });
    window.addEventListener('resize', resizeCanvas);
} );

