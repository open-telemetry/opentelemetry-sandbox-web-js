import * as assert from 'assert';
import * as sinon from 'sinon';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { WebVitalsInstrumentation } from '../src';

describe('WebVitalsInstrumentation', () => {
  let webVitalsInstrumentation: WebVitalsInstrumentation;
  let sandbox: sinon.SinonSandbox;
  let exportSpy: sinon.SinonStub;
  let deregister: () => void;
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    webVitalsInstrumentation = new WebVitalsInstrumentation({
      enabled: false,
    });

    deregister = registerInstrumentations({
      instrumentations: [webVitalsInstrumentation],
    });
  });
  it('should run tests', () => {
    assert.equal(true, true);
  });
});
