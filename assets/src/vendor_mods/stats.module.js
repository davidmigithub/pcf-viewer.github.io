var Stats = function () {

	var container = document.createElement('div');
	container.style.cssText = 'position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000';

	// Only FPS panel
	var fpsPanel = new Stats.Panel('FPS', '#fff');
	container.appendChild(fpsPanel.dom);

	// Local timing variables
	var beginTime = (performance || Date).now(),
		prevTime = beginTime,
		frames = 0;

	function begin() {
		beginTime = (performance || Date).now();
	}

	function end() {
		frames++;
		var time = (performance || Date).now();
		if (time >= prevTime + 1000) {
			fpsPanel.update((frames * 1000) / (time - prevTime));
			prevTime = time;
			frames = 0;
		}
		return time;
	}

	return {
		REVISION: 16,
		dom: container,
		begin: begin,
		end: end
	};
};

Stats.Panel = function (name, fg) {
    var round = Math.round;
    var PR = round(window.devicePixelRatio || 1);

    var WIDTH = 80 * PR, HEIGHT = 16 * PR;
    var TEXT_X = 3 * PR, TEXT_Y = 2 * PR;

    var canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText = 'width:80px;height:16px';

    var context = canvas.getContext('2d');
    context.font = 'bold ' + (9 * PR) + 'px Helvetica,Arial,sans-serif';
    context.textBaseline = 'top';

    return {
        dom: canvas,
        update: function (value) {
            // Clear entire canvas for transparent background
            context.clearRect(0, 0, WIDTH, HEIGHT);
            // Draw FPS text
            context.fillStyle = fg;
            context.fillText(round(value) + ' FPS', TEXT_X, TEXT_Y);
        }
    };
};

export default Stats;