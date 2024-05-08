document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('webglCanvas');
    const gl = canvas.getContext('webgl');
    const video = document.getElementById('videoElement');
    const colorPicker1 = document.getElementById('colorPicker1');
    const colorPicker2 = document.getElementById('colorPicker2');
    let shaderProgram, videoTexture;

    let targetColor1 = [1.0, 0.0, 0.0, 1.0]; // Color 1

    let targetColor2 = [0.0, 1.0, 0.0, 1.0]; // Color 2

    let intervalID;


    const W = 1000;
    const H = 1000;

    // Setting up shaders
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
    uniform vec4 targetColor1;
    uniform vec4 targetColor2;

    void main() {
        vec2 uv = vTexCoord.xy;
        vec2 maskUv = uv * vec2(0.5, 0.3333);
        vec2 maskUvRight = uv * vec2(0.5, 0.3333) + vec2(0.5, 0.0);
        vec2 adjustedUv = uv * vec2(1.0, 0.6666) + vec2(0.0, 0.3333);

        vec4 originalColor = texture2D(uSampler, adjustedUv);
        vec4 maskColor = texture2D(uSampler, maskUv);
        vec4 maskColorRight = texture2D(uSampler, maskUvRight);

        float edgeWidth = 0.4;
        float maskAlpha1 = smoothstep(0.0, 0.8, maskColor.r);
        float maskAlpha2 = smoothstep(0.0, 0.7, maskColorRight.r);

        vec4 color1 = originalColor * targetColor1;
        vec4 color2 = originalColor * targetColor2;

        vec4 finalColor = mix(originalColor, color1, maskAlpha1);
        finalColor = mix(finalColor, color2, maskAlpha2);
        

        gl_FragColor = finalColor;
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
    }

    function updateTexture() {
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            gl.bindTexture(gl.TEXTURE_2D, videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        }
    }


    function render() {
        gl.viewport(0, 0, canvas.width, canvas.height);
        updateTexture();
        if (!shaderProgram || !videoTexture) return;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        setupBuffersAndAttributes();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);

        const hexColor = hexToRGBA(colorPicker1.value);
        gl.uniform4f(gl.getUniformLocation(shaderProgram, 'targetColor1'), hexColor[0], hexColor[1], hexColor[2], hexColor[3]);

        const hexColor2 = hexToRGBA(colorPicker2.value);
        gl.uniform4f(gl.getUniformLocation(shaderProgram, 'targetColor2'), hexColor2[0], hexColor2[1], hexColor2[2], hexColor2[3]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    colorPicker1.addEventListener('input', render);
    colorPicker2.addEventListener('input', render);

    initShaders();
    initTexture();

    function resizeCanvas() {
        let windowRatio = window.innerWidth / window.innerHeight;
        let videoRatio = W / H;

        if (windowRatio < videoRatio) {
            // The height of the window is the limiting factor
            canvas.height = window.innerHeight;
            canvas.width = canvas.height * videoRatio;
        } else {
            // The window width is the limiting factor
            canvas.width = window.innerWidth;
            canvas.height = canvas.width / videoRatio;
        }

        // Center the canvas
        canvas.style.position = "absolute";
        canvas.style.left = (window.innerWidth - canvas.width) / 2 + 'px';
        canvas.style.top = (window.innerHeight - canvas.height) / 2 + 'px';

        gl.viewport(0, 0, canvas.width, canvas.height); // Configuring the WebGL viewport
        render();
    }


    window.onload = resizeCanvas;
    window.onresize = resizeCanvas;

    video.addEventListener('play', function () {
        function renderLoop() {
            if (!video.paused && !video.ended) {
                render();
                requestAnimationFrame(renderLoop);
            }
        }

        updateTexture();
        render();
        animFrameId = requestAnimationFrame(renderLoop); // analog is setInterval
    });

    document.getElementById('playPauseBtn').addEventListener('click', function () {
        if (video.paused) {
            video.play();
            this.textContent = 'Pause';

        } else {
            video.pause();
            this.textContent = 'Play';
            cancelAnimationFrame(animFrameId);
        }
    });


    function hexToRGBA(hex) {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return [r / 255, g / 255, b / 255, 1];
    }



    function setupBuffersAndAttributes() {
        const vertices = new Float32Array([
            -1.0, -1.0, 0.0, 0.0,
            1.0, -1.0, 1.0, 0.0,
            -1.0, 1.0, 0.0, 1.0,
            -1.0, 1.0, 0.0, 1.0,
            1.0, -1.0, 1.0, 0.0,
            1.0, 1.0, 1.0, 1.0
        ]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(shaderProgram, "position");
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 4 * 4, 0);
        gl.enableVertexAttribArray(positionLoc);

        const texCoordLoc = gl.getAttribLocation(shaderProgram, "texCoord");
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
        gl.enableVertexAttribArray(texCoordLoc);
    }
});
