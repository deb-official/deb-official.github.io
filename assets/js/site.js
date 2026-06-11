function initEmailCanvas() {
    const canvas = document.getElementById('emailCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const email = 'saharoy.d@northeastern.edu';
    const font = "22px 'Dancing Script', cursive";

    ctx.font = font;
    const width = ctx.measureText(email).width;
    canvas.width  = Math.ceil(width) + 4;
    canvas.height = 32;

    ctx.font      = font;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(email, 2, 24);
}