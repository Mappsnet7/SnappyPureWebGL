document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('webglCanvas');
    const gl = canvas.getContext('webgl');
    const video = document.getElementById('videoElement');
    const colorPicker = document.getElementById('colorPicker');
    let shaderProgram, videoTexture;

    let targetColor = [0.0, 0.0, 1.0, 1.0]; // Синий по умолчанию
    
    const W = 1000; // Примерная ширина, желательно соответствующая размеру видео
    const H = 1000; // Примерная высота, желательно соответствующая размеру видео

    // Настройка шейдеров
    const vertShaderSource = `
        attribute vec2 position;
        attribute vec2 texCoord;
        varying highp vec2 vTexCoord;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
            vTexCoord = texCoord;
        }
    `;
    
    const fragShaderSource = `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform sampler2D uSampler;
        uniform vec4 targetColor;
        
        void main() {
            vec2 uv = vTexCoord.xy;
            vec2 maskUv = vec2(uv.x, uv.y * 0.5);
            vec2 adjustedUv = vec2(uv.x, uv.y * 0.5 + 0.5);
            
            vec4 originalColor = texture2D(uSampler, adjustedUv);
            vec4 maskColor = texture2D(uSampler, maskUv);
            gl_FragColor = vec4(originalColor.rgb, originalColor.a );

            float maskAlpha = (maskColor.r + maskColor.g + maskColor.b) / 3.0;
            maskAlpha = 1.0 - maskAlpha;

            if(maskColor.r < 0.5 && maskColor.g < 0.5 && maskColor.b < 0.5) {
                gl_FragColor = vec4(originalColor.rgb, originalColor.a);
            } else {
                vec4 multiplyColor = originalColor * targetColor;
                gl_FragColor = vec4(multiplyColor.rgb, originalColor.a * targetColor.a * maskAlpha);
            }
        }
    `;
    
    async function initShaders() {
        const vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, vertShaderSource);
        gl.compileShader(vertShader);
        if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
            console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertShader));
            return;
        }

        const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, fragShaderSource);
        gl.compileShader(fragShader);
        if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
            console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragShader));
            return;
        }

        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertShader);
        gl.attachShader(shaderProgram, fragShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        gl.useProgram(shaderProgram);
    }

    function initTexture() {
        videoTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        updateTexture();
    }

    function updateTexture() {
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            gl.bindTexture(gl.TEXTURE_2D, videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        }
    }


    function render() {
        updateTexture();
        if (!shaderProgram || !videoTexture) return;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        setupBuffersAndAttributes();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);

        const hexColor = hexToRGBA(colorPicker.value);
        gl.uniform4f(gl.getUniformLocation(shaderProgram, 'targetColor'), hexColor[0], hexColor[1], hexColor[2], hexColor[3]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function startRenderingLoop() {
        if (!video.paused) {
          requestAnimationFrame(startRenderingLoop);
        }
        render();
      }
    
    colorPicker.addEventListener('input', render);

    initShaders();
    initTexture();
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // Вызовите функцию resizeCanvas при загрузке страницы и при изменении размера окна
    window.onload = resizeCanvas;
    window.onresize = resizeCanvas;

    video.addEventListener('play', () => {
        updateTexture();
        render();
        
    });

    document.getElementById('playPauseBtn').addEventListener('click', function() {
        if (video.paused) {
          video.play();
          this.textContent = 'Pause';
        } else {
          video.pause();
          this.textContent = 'Play';
        }
        startRenderingLoop(); // Запускаем отрисовку здесь
      });

    function hexToRGBA(hex) {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return [r / 255, g / 255, b / 255, 1];
    }
    function setupBuffersAndAttributes() {
        // Определение вершин квадрата и инвертирование текстурных координат по оси Y
        const vertices = new Float32Array([
            -1.0, -1.0, 0.0, 0.0, // Левый нижний угол
             1.0, -1.0, 1.0, 0.0, // Правый нижний угол
            -1.0,  1.0, 0.0, 1.0, // Левый верхний угол
            -1.0,  1.0, 0.0, 1.0, // Левый верхний угол
             1.0, -1.0, 1.0, 0.0, // Правый нижний угол
             1.0,  1.0, 1.0, 1.0  // Правый верхний угол
        ]);
        
        // Создание буфера вершин и загрузка данных вершин
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Получение и установка атрибута position
        const positionLoc = gl.getAttribLocation(shaderProgram, "position");
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 4 * 4, 0);
        gl.enableVertexAttribArray(positionLoc);
        
        // Получение и установка атрибута texCoord
        const texCoordLoc = gl.getAttribLocation(shaderProgram, "texCoord");
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
        gl.enableVertexAttribArray(texCoordLoc);
    }
    
    

});
