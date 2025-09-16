import { assertIsNotNull } from './assertIsNotNull';

const doDebug = false;

export class Timer {
  startTime: bigint | null = null;

  restart(): Timer {
    this.startTime = process.hrtime.bigint();
    return this;
  }

  get elapsedSeconds() {
    assertIsNotNull(this.startTime);
    const elapsedNanoseconds = process.hrtime.bigint() - this.startTime;
    const result = Number(elapsedNanoseconds) / 1_000_000_000;

    return result;
  }

  logElapsedSeconds(label: string) {
    if (doDebug) {
      console.log(label, this.elapsedSeconds.toFixed(2));
    }

    this.restart();
  }
}
