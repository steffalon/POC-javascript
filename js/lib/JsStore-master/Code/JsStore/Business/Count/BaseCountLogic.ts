module JsStore {
    export module Business {
        export module Count {
            export class BaseCount extends Base {
                ResultCount: number = 0;
                SkipRecord;
                LimitRecord;
                CheckFlag = false;
            }
        }
    }
}