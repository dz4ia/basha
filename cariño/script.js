window.requestAnimationFrame =
    window.__requestAnimationFrame ||
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback, element) {
        var lastTime = element.__lastTime || 0;
        var currTime = Date.now();
        var timeToCall = Math.max(1, 33 - (currTime - lastTime));
        window.setTimeout(callback, timeToCall);
        element.__lastTime = currTime + timeToCall;
    };

window.isDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    ((navigator.userAgent || navigator.vendor || window.opera)).toLowerCase()
);

var loaded = false;
var init = function () {
    if (loaded) return;
    loaded = true;

    var mobile = window.isDevice;
    var koef = mobile ? 0.5 : 1;
    var canvas = document.getElementById('heart');
    var ctx = canvas.getContext('2d');
    var width = canvas.width = koef * innerWidth;
    var height = canvas.height = koef * innerHeight;
    var rand = Math.random;

    // === FONDO: partículas que caen ===
    var bgParticles = [];
    var bgParticleCount = mobile ? 40 : 100;

    for (let i = 0; i < bgParticleCount; i++) {
        bgParticles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.3,
            alpha: Math.random() * 0.5 + 0.3
        });
    }

    function updateBackgroundParticles() {
        for (let i = 0; i < bgParticles.length; i++) {
            let p = bgParticles[i];
            p.y += p.speed;
            if (p.y > height) {
                p.y = 0;
                p.x = Math.random() * width;
            }
        }
    }

    function drawBackgroundParticles() {
        ctx.save();
        for (let i = 0; i < bgParticles.length; i++) {
            let p = bgParticles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.fill();
        }
        ctx.restore();
    }

    // === CORAZÓN ===
    var heartPosition = function (rad) {
        return [
            Math.pow(Math.sin(rad), 3),
            -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad))
        ];
    };

    var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
        return [dx + pos[0] * sx, dy + pos[1] * sy];
    };

    var traceCount = mobile ? 20 : 50;
    var pointsOrigin = [];
    var dr = mobile ? 0.3 : 0.1;

    for (let i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 210, 13, 0, 0));
    for (let i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 150, 9, 0, 0));
    for (let i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 90, 5, 0, 0));

    var heartPointsCount = pointsOrigin.length;
    var targetPoints = [];

    var pulse = function (kx, ky) {
        for (let i = 0; i < pointsOrigin.length; i++) {
            targetPoints[i] = [
                kx * pointsOrigin[i][0] + width / 2,
                ky * pointsOrigin[i][1] + height / 2
            ];
        }
    };

    var e = [];
    for (let i = 0; i < heartPointsCount; i++) {
        let x = rand() * width;
        let y = rand() * height;
        e[i] = {
            vx: 0, vy: 0, R: 2,
            speed: rand() + 5,
            q: ~~(rand() * heartPointsCount),
            D: 2 * (i % 2) - 1,
            force: 0.2 * rand() + 0.7,
            f: "hsla(0," + ~~(40 * rand() + 60) + "%," + ~~(60 * rand() + 20) + "%,.3)",
            trace: []
        };
        for (let k = 0; k < traceCount; k++) e[i].trace[k] = {x: x, y: y};
    }

    var config = { traceK: 0.4, timeDelta: 0.01 };
    var time = 0;

    var loop = function () {
        // Fondo con leve opacidad
        ctx.fillStyle = "rgba(89, 17, 17, 0.2)";
        ctx.fillRect(0, 0, width, height);

        // Partículas del fondo
        updateBackgroundParticles();
        drawBackgroundParticles();

        // Corazón
        var n = -Math.cos(time);
        pulse((1 + n) * 0.5, (1 + n) * 0.5);
        time += ((Math.sin(time)) < 0 ? 9 : (n > 0.8) ? 0.2 : 1) * config.timeDelta;

        for (let i = e.length; i--;) {
            let u = e[i];
            let q = targetPoints[u.q];
            let dx = u.trace[0].x - q[0];
            let dy = u.trace[0].y - q[1];
            let length = Math.sqrt(dx * dx + dy * dy);

            if (length < 10) {
                if (rand() > 0.95) {
                    u.q = ~~(rand() * heartPointsCount);
                } else {
                    if (rand() > 0.99) u.D *= -1;
                    u.q += u.D;
                    u.q %= heartPointsCount;
                    if (u.q < 0) u.q += heartPointsCount;
                }
            }

            u.vx += -dx / length * u.speed;
            u.vy += -dy / length * u.speed;
            u.trace[0].x += u.vx;
            u.trace[0].y += u.vy;
            u.vx *= u.force;
            u.vy *= u.force;

            for (let k = 0; k < u.trace.length - 1;) {
                let T = u.trace[k];
                let N = u.trace[++k];
                N.x -= config.traceK * (N.x - T.x);
                N.y -= config.traceK * (N.y - T.y);
            }

            ctx.fillStyle = u.f;
            for (let k = 0; k < u.trace.length; k++) {
                ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
            }
        }

        window.requestAnimationFrame(loop, canvas);
    };

    window.addEventListener('resize', function () {
        width = canvas.width = koef * innerWidth;
        height = canvas.height = koef * innerHeight;
    });

    loop();
};

if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init, false);
}
