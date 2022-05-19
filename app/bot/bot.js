const FishingZone = require('./zone.js');

const sleep = (time) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
};


const colorConditions = {
  isBobber: ([r, g, b]) => (r - g > 20 && r - b > 20) && (g < 100 && b < 100),
  isWarning: ([r, g, b]) => r - b > 200 && g - b > 200,
  isError: ([r, g, b]) => r - g > 250 && r - b > 250
};

const bot = (controls, zone, config, winSwitch) => {
  const { keyboard, mouse, workwindow } = controls;
  const { delay, relZone } = config;
  const { isBobber, isWarning, isError } = colorConditions;

  zone = zone.toRel(relZone)
  const fishingZone = FishingZone.from(workwindow, zone);

  const castFishing = async (state) => {
      const { fishingKey, castDelay } = config;

      await winSwitch.execute(workwindow);
      keyboard.sendKey(fishingKey, delay);
      winSwitch.finished();

      if(state.status == 'initial') {
        await sleep(250);
        if(await fishingZone.checkNotifications(isError, isWarning)) {
          throw new Error(`This place isn't good for fishing`);
        } else {
          state.status = 'working';
        }
      }

      await sleep(castDelay);
  };

    const findBobber = () => fishingZone.findBobber(isBobber);

    const checkBobber = async (bobberPos, state) => {
      const { maxFishTime, checkingDelay } = config;
      const startCheckingTime = Date.now();
      while(state.status == 'working' && Date.now() - startCheckingTime < maxFishTime) {

        if(!isBobber(fishingZone.colorAt(bobberPos))) {
         const newBobberPos = bobberPos.getPointsAround()
         .find((pointPos) => isBobber(fishingZone.colorAt(pointPos)));

          if(!newBobberPos) {
            return bobberPos;
          } else {
            bobberPos = newBobberPos;
          }
        }

        await sleep(checkingDelay);
      }
    };

    const hookBobber = async (bobber) => {
      const{ afterHookDelay,
             shiftClick,
             likeHuman,
             mouseMoveSpeed,
             mouseCurvatureStrength } = config;

      await winSwitch.execute(workwindow);
      if(likeHuman) {
        mouse.moveCurveTo(bobber.x, bobber.y,
                          mouseMoveSpeed + Math.random() * 3,
                          mouseCurvatureStrength + Math.random() * 100);
      } else {
        mouse.moveTo(bobber.x, bobber.y, delay);
      }

      if(shiftClick) {
        keyboard.toggleKey('shift', true, delay);
        mouse.click('right', delay);
        keyboard.toggleKey('shift', false, delay);
      } else {
        mouse.click('right', delay);
      }
      winSwitch.finished();

      await sleep(250);
      if(!(await fishingZone.checkNotifications(isWarning))) {
        await sleep(afterHookDelay.caught + Math.random() * 500);
        return true;
      } else {
        await sleep(afterHookDelay.miss + Math.random() * 500);
      }
    };

     return {
       castFishing,
       findBobber,
       checkBobber,
       hookBobber
     }
};

module.exports = bot;