module JsStore {
    export module Business {
        export class Base extends BaseHelper {
            Error: IError;
            ErrorOccured: boolean = false;
            ErrorCount = 0;
            RowAffected = 0;
            OnSuccess: Function;
            OnError: Function;
            Transaction: IDBTransaction;
            ObjectStore: IDBObjectStore;
            Query;
            SendResultFlag: Boolean = true;

            protected onErrorOccured = function (e, customError = false) {
                ++this.ErrorCount;
                if (this.ErrorCount == 1) {
                    if (this.OnError != null) {
                        if (!customError) {
                            var Error = <IError>{
                                Name: (e as any).target.error.name,
                                Message: (e as any).target.error.message
                            }
                            this.OnError(Error);
                        }
                        else {
                            this.OnError(e);
                        }
                        if (EnableLog) {
                            console.error(Error);
                        }
                    }
                }
            }

            protected onTransactionTimeout = function (e) {
                console.log('transaction timed out');
            }

            protected onExceptionOccured = function (ex: DOMException, info) {
                switch (ex.name) {
                    case 'NotFoundError':
                        var Error = Utils.getError(ErrorType.TableNotExist, info);
                        throwError(Error);
                    default: console.error(ex);
                }
            }

            /**
            * For matching the different column value existance
            * 
            * @private
            * @param {any} where 
            * @param {any} value 
            * @returns 
            * 
            * @memberOf SelectLogic
            */
            protected checkForWhereConditionMatch(rowValue) {
                var Where = this.Query.Where,
                    Status = true;
                var checkIn = function (column, value) {
                    var Values = Where[column].In;
                    for (var i = 0, length = Values.length; i < length; i++) {
                        if (Values[i] == value) {
                            Status = true;
                            break;
                        }
                        else {
                            Status = false;
                        }
                    };
                },
                    checkLike = function (column, value) {
                        var Values = Where[column].Like.split('%'),
                            CompSymbol: Occurence,
                            CompValue,
                            SymbolIndex;
                        if (Values[1]) {
                            CompValue = Values[1];
                            CompSymbol = Values.length > 2 ? Occurence.Any : Occurence.Last;
                        }
                        else {
                            CompValue = Values[0];
                            CompSymbol = Occurence.First;
                        }
                        value = value.toLowerCase();

                        switch (CompSymbol) {
                            case Occurence.Any:
                                SymbolIndex = value.indexOf(CompValue.toLowerCase());
                                if (SymbolIndex < 0) {
                                    Status = false;
                                }; break;
                            case Occurence.First:
                                SymbolIndex = value.indexOf(CompValue.toLowerCase());
                                if (SymbolIndex > 0 || SymbolIndex < 0) {
                                    Status = false;
                                }; break;
                            default:
                                SymbolIndex = value.lastIndexOf(CompValue.toLowerCase());
                                if (SymbolIndex < value.length - CompValue.length) {
                                    Status = false;
                                };
                        }
                    },
                    checkComparisionOp = function (column, value, symbol) {
                        var CompareValue = Where[column][symbol];
                        switch (symbol) {
                            //greater than
                            case '>': if (value <= CompareValue) {
                                Status = false;
                            }; break;
                            //less than
                            case '<': if (value >= CompareValue) {
                                Status = false;
                            }; break;
                            //less than equal
                            case '<=': if (value > CompareValue) {
                                Status = false;
                            }; break;
                            //greather than equal
                            case '>=': if (value < CompareValue) {
                                Status = false;
                            }; break;
                            //between
                            case '-': if (value < CompareValue.Low || value > CompareValue.High) {
                                Status = false;
                            }; break;
                        }
                    };
                for (var Column in Where) {
                    var ColumnValue = Where[Column];
                    if (Status) {
                        if (typeof ColumnValue == 'object') {
                            for (var key in ColumnValue) {
                                if (Status) {
                                    switch (key) {
                                        case 'In': checkIn(Column, rowValue[Column]); break;
                                        case 'Like': checkLike(Column, rowValue[Column]); break;
                                        case '-':
                                        case '>':
                                        case '<':
                                        case '>=':
                                        case '<=':
                                            checkComparisionOp(Column, rowValue[Column], key); break;
                                    }
                                }
                                else {
                                    break;
                                }
                            }
                        }
                        else {
                            var CompareValue = rowValue[Column];
                            if (ColumnValue != CompareValue) {
                                Status = false;
                                break;
                            }
                        }
                    }
                    else {
                        break;
                    }
                }
                return Status;
            }

            protected goToWhereLogic = function () {
                var Column = getObjectFirstKey(this.Query.Where);
                if (this.Query.IgnoreCase === true) {
                    this.Query.Where = this.makeQryInCaseSensitive(this.Query.Where);
                }
                if (this.ObjectStore.indexNames.contains(Column)) {
                    var Value = this.Query.Where[Column];
                    if (typeof Value == 'object') {
                        this.CheckFlag = Boolean(Object.keys(Value).length > 1 || Object.keys(this.Query.Where).length > 1);
                        var Key = getObjectFirstKey(Value);
                        switch (Key) {
                            case 'Like': {
                                var FilterValue = Value.Like.split('%');
                                if (FilterValue[1]) {
                                    if (FilterValue.length > 2) {
                                        this.executeLikeLogic(Column, FilterValue[1], Occurence.Any);
                                    }
                                    else {
                                        this.executeLikeLogic(Column, FilterValue[1], Occurence.Last);
                                    }
                                }
                                else {
                                    this.executeLikeLogic(Column, FilterValue[0], Occurence.First);
                                }
                            }; break;
                            case 'In':
                                this.executeInLogic(Column, Value['In']);
                                break;
                            case '-':
                            case '>':
                            case '<':
                            case '>=':
                            case '<=':
                                this.executeWhereLogic(Column, Value, Key);
                                break;
                            case 'Aggregate': break;
                            default: this.executeWhereLogic(Column, Value);
                        }
                    }
                    else {
                        this.CheckFlag = Boolean(Object.keys(this.Query.Where).length > 1);
                        this.executeWhereLogic(Column, Value);
                    }
                }
                else {
                    this.ErrorOccured = true;
                    this.Error = Utils.getError(ErrorType.ColumnNotExist, { ColumnName: Column });
                    throwError(this.Error);
                }
            }

            protected makeQryInCaseSensitive = function (qry) {
                var Results = [],
                    Qry;
                for (var item in qry) {
                    Qry = qry[item];
                    switch (item) {
                        case WhereQryOption.In:
                            for (var value in Qry) {
                                Results = Results.concat(this.getAllCombinationOfWord(Qry['In'], true));
                            }
                            break;
                        case WhereQryOption.Like: break;
                        default:
                            Results = Results.concat(this.getAllCombinationOfWord(Qry));
                    }
                    qry[item] = {
                        In: Results
                    }
                    Results = [];
                }
                return qry;
            }
        }
    }

}
