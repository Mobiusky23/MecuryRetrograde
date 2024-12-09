class SolarSystemAnimation {
    constructor() {
        // 初始化画布
        this.solarSystem = document.getElementById('solarSystem');
        this.earthView = document.getElementById('earthView');
        this.solarCtx = this.solarSystem.getContext('2d');
        this.earthCtx = this.earthView.getContext('2d');

        // 设置画布大小
        this.solarSystem.width = this.earthView.width = 400;
        this.solarSystem.height = this.earthView.height = 400;

        // 动画控制
        this.isPlaying = false;
        this.time = 0;
        this.speed = 1;

        // 轨道参数
        this.centerX = this.solarSystem.width / 2;
        this.centerY = this.solarSystem.height / 2;
        this.mercuryOrbit = 80;
        this.earthOrbit = 150;
        
        // 行星周期（以帧为单位）
        this.mercuryPeriod = 88;
        this.earthPeriod = 365;

        // 添加轨迹画布
        this.mercuryTrail = document.getElementById('mercuryTrail');
        this.trailCtx = this.mercuryTrail.getContext('2d');
        this.mercuryTrail.width = this.mercuryTrail.height = 400;

        // 存储轨迹点
        this.trailPoints = [];
        this.maxTrailPoints = 500; // 最大轨迹点数

        // 添加录制相关的属性
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        // 创建用于录制的画布
        this.recordCanvas = document.createElement('canvas');
        this.recordCanvas.width = this.solarSystem.width * 3 + 40;
        this.recordCanvas.height = this.solarSystem.height + 40;
        this.recordCtx = this.recordCanvas.getContext('2d');

        // 添加支持的格式配置
        this.videoFormats = {
            'webm': { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
            'gif': { mimeType: 'video/webm', extension: 'gif', needsConversion: true }
        };

        // 初始化控制器
        this.initControls();
        
        // 开始动画循环
        this.animate();
    }

    initControls() {
        // 播放/暂停按钮
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());

        // 时间滑块
        this.timeSlider = document.getElementById('timeSlider');
        this.timeSlider.addEventListener('input', (e) => {
            this.time = parseFloat(e.target.value);
            this.clearTrail(); // 清除轨迹
            this.updateAnimation();
        });

        // 速度选择
        this.speedSelect = document.getElementById('speedSelect');
        this.speedSelect.addEventListener('change', (e) => {
            this.speed = parseFloat(e.target.value);
        });

        // 修改时间滑块的最大值为地球公转周期
        this.timeSlider = document.getElementById('timeSlider');
        this.timeSlider.max = this.earthPeriod;  // 改为365

        // 添加水星初始角度偏移
        this.mercuryOffset = -Math.PI / 6;  // -30度

        // 添加下载按钮控制
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.addEventListener('click', () => this.startRecording());
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        const icon = this.playPauseBtn.querySelector('img');
        if (this.isPlaying) {
            icon.src = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 5h3v14H8V5zm5 0h3v14h-3V5z' fill='%23007AFF'/%3E%3C/svg%3E";
        } else {
            icon.src = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 5.14v13.72c0 .9.97 1.46 1.74.99l10.12-6.87c.7-.47.7-1.51 0-1.98L9.74 4.15C8.97 3.68 8 4.24 8 5.14z' fill='%23007AFF'/%3E%3C/svg%3E";
        }
        if (!this.isPlaying) {
            this.clearTrail(); // 停止时清除轨迹
        }
    }

    getPlanetPosition(orbit, period, time, offset = 0) {
        // 添加角度偏移参数
        const angle = (time / period) * Math.PI * 2 + offset;
        return {
            x: this.centerX + orbit * Math.cos(angle),
            y: this.centerY + orbit * Math.sin(angle)
        };
    }

    drawSolarSystem() {
        const ctx = this.solarCtx;
        ctx.clearRect(0, 0, this.solarSystem.width, this.solarSystem.height);

        // 绘制轨道
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.arc(this.centerX, this.centerY, this.mercuryOrbit, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.earthOrbit, 0, Math.PI * 2);
        ctx.stroke();

        // 绘制太阳
        ctx.beginPath();
        ctx.fillStyle = '#FFD700';
        ctx.arc(this.centerX, this.centerY, 20, 0, Math.PI * 2);
        ctx.fill();

        // 绘制水星（添加初始角度偏移）
        const mercury = this.getPlanetPosition(this.mercuryOrbit, this.mercuryPeriod, this.time, this.mercuryOffset);
        ctx.beginPath();
        ctx.fillStyle = '#A0522D';
        ctx.arc(mercury.x, mercury.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // 绘制地球
        const earth = this.getPlanetPosition(this.earthOrbit, this.earthPeriod, this.time);
        ctx.beginPath();
        ctx.fillStyle = '#4169E1';
        ctx.arc(earth.x, earth.y, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEarthView() {
        const ctx = this.earthCtx;
        ctx.clearRect(0, 0, this.earthView.width, this.earthView.height);

        // 获取行星位置（添加水星的初始角度偏移）
        const mercury = this.getPlanetPosition(this.mercuryOrbit, this.mercuryPeriod, this.time, this.mercuryOffset);
        const earth = this.getPlanetPosition(this.earthOrbit, this.earthPeriod, this.time);

        // 计算水星相对于地球的角度
        const angle = Math.atan2(mercury.y - earth.y, mercury.x - earth.x);
        
        // 在地球视图中绘制观测到的水星位置
        const viewRadius = 150;
        const viewX = this.centerX + viewRadius * Math.cos(angle);
        const viewY = this.centerY + viewRadius * Math.sin(angle);

        // 绘制观测圆环
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.arc(this.centerX, this.centerY, viewRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 绘制水星
        ctx.beginPath();
        ctx.fillStyle = '#A0522D';
        ctx.arc(viewX, viewY, 8, 0, Math.PI * 2);
        ctx.fill();

        // 绘制参考线
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(viewX, viewY);
        ctx.stroke();
    }

    drawMercuryTrail() {
        const ctx = this.trailCtx;
        ctx.clearRect(0, 0, this.mercuryTrail.width, this.mercuryTrail.height);

        // 获取当前水星和地球位置
        const mercury = this.getPlanetPosition(this.mercuryOrbit, this.mercuryPeriod, this.time, this.mercuryOffset);
        const earth = this.getPlanetPosition(this.earthOrbit, this.earthPeriod, this.time);

        // 计算水星相对于地球的角度和距离
        const dx = mercury.x - earth.x;
        const dy = mercury.y - earth.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 添加新的轨迹点
        this.trailPoints.push({
            x: this.centerX + distance * Math.cos(angle),
            y: this.centerY + distance * Math.sin(angle)
        });

        // 限制轨迹点数量
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }

        // 绘制轨迹
        ctx.beginPath();
        ctx.strokeStyle = '#A0522D';
        ctx.lineWidth = 1;
        ctx.moveTo(this.trailPoints[0].x, this.trailPoints[0].y);
        for (let i = 1; i < this.trailPoints.length; i++) {
            ctx.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
        }
        ctx.stroke();

        // 绘制地球（中心点）
        ctx.beginPath();
        ctx.fillStyle = '#4169E1';
        ctx.arc(this.centerX, this.centerY, 12, 0, Math.PI * 2);
        ctx.fill();

        // 绘制当前水星位置
        ctx.beginPath();
        ctx.fillStyle = '#A0522D';
        const currentPoint = this.trailPoints[this.trailPoints.length - 1];
        ctx.arc(currentPoint.x, currentPoint.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    updateAnimation() {
        // 绘制各个视图
        this.drawSolarSystem();
        this.drawEarthView();
        this.drawMercuryTrail();

        // 如果正在录制，将所有画布合并到录制画布上
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.recordCtx.fillStyle = '#000';
            this.recordCtx.fillRect(0, 0, this.recordCanvas.width, this.recordCanvas.height);
            
            // 设置文字样式
            this.recordCtx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            this.recordCtx.fillStyle = '#fff';
            this.recordCtx.textAlign = 'center';

            // 绘制第一个视图和标题
            this.recordCtx.drawImage(this.solarSystem, 0, 40);
            this.recordCtx.fillText('太阳系视角', this.solarSystem.width/2, 25);

            // 绘制第二个视图和标题
            const view2X = this.solarSystem.width + 20;
            this.recordCtx.drawImage(this.earthView, view2X, 40);
            this.recordCtx.fillText('地球观测视角', view2X + this.earthView.width/2, 25);

            // 绘制第三个视图和标题
            const view3X = (this.solarSystem.width + 20) * 2;
            this.recordCtx.drawImage(this.mercuryTrail, view3X, 40);
            this.recordCtx.fillText('水星轨迹', view3X + this.mercuryTrail.width/2, 25);
        }
    }

    animate() {
        if (this.isPlaying) {
            // 修改动画循环范围为地球公转周期
            this.time = (this.time + this.speed) % this.earthPeriod;
            this.timeSlider.value = this.time;
        }
        
        this.updateAnimation();
        requestAnimationFrame(() => this.animate());
    }

    // 在重置游戏或改变时间时清除轨迹
    clearTrail() {
        this.trailPoints = [];
    }

    async startRecording() {
        if (this.mediaRecorder) return;

        const formatSelect = document.getElementById('formatSelect');
        const selectedFormat = this.videoFormats[formatSelect.value];

        // 准备录制
        const stream = this.recordCanvas.captureStream(30);
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: selectedFormat.mimeType,
            videoBitsPerSecond: 5000000
        });

        this.recordedChunks = [];
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };

        this.mediaRecorder.onstop = async () => {
            const blob = new Blob(this.recordedChunks, { type: selectedFormat.mimeType });
            
            if (selectedFormat.needsConversion && selectedFormat.extension === 'gif') {
                // 如果选择了 GIF 格式，使用 gif.js 转换
                const gif = new GIF({
                    workers: 2,
                    quality: 10,
                    width: this.recordCanvas.width,
                    height: this.recordCanvas.height
                });

                // 每帧添加到 GIF
                const video = document.createElement('video');
                video.src = URL.createObjectURL(blob);
                video.addEventListener('loadeddata', () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = this.recordCanvas.width;
                    canvas.height = this.recordCanvas.height;

                    const captureFrame = () => {
                        if (video.currentTime < video.duration) {
                            ctx.drawImage(video, 0, 0);
                            gif.addFrame(canvas, { delay: 33 }); // 约30fps
                            video.currentTime += 0.033;
                        } else {
                            gif.render();
                        }
                    };

                    gif.on('finished', (blob) => {
                        this.downloadFile(blob, `mercury-retrograde.${selectedFormat.extension}`);
                    });

                    video.currentTime = 0;
                    captureFrame();
                });
            } else {
                // 直接下载其他格式
                this.downloadFile(blob, `mercury-retrograde.${selectedFormat.extension}`);
            }

            this.mediaRecorder = null;
        };

        // 重置动画状态
        this.time = 0;
        this.timeSlider.value = 0;
        this.clearTrail();
        this.isPlaying = true;

        // 开始录制
        this.mediaRecorder.start();

        // 录制一个完整周期后停止
        setTimeout(() => {
            this.mediaRecorder.stop();
            this.isPlaying = false;
        }, (this.earthPeriod / this.speed) * (1000 / 30)); // 根据速度和帧率计算持续时间
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 启动动画
document.addEventListener('DOMContentLoaded', () => {
    new SolarSystemAnimation();
}); 