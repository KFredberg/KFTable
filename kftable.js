define(["jquery", "text!./kftable.css", "translator", "general.utils/property-resolver", "general.utils/number-formatting" ,"util", "qlik","./d3"], function($, cssContent, translator, pResolver, numFormatting, util , qlik) {'use strict';
	$("<style>").html(cssContent).appendTo("head");

	function updateMeasures(object, data) {
			pResolver.setValue(data.properties, "kfMeasuresDirty" , true);
			return true;
		}
	function updateFilterExpression(object, data) {

			var val = object.values.split(',').map(function(d){
							return "[" + d.trimLeft().trimRight() + "]";
						}).join(",");
			
			switch(object.kfFilterType) {
			    case 0:
			        pResolver.setValue(object, "filterExpression", object.field + "="); 
			        break;
			    case 1:
			        pResolver.setValue(object, "filterExpression", object.field + "={" + val + "}"); 
			        break;
			    case 2:
			        pResolver.setValue(object, "filterExpression", object.field + "={'*'} - {" + val + "}"); 
			        break;
			    case 3:
			        pResolver.setValue(object, "filterExpression", object.field + "={'>=" + object.rangeFrom + "<=" + object.rangeTo + "'}"); 
			        break;
			    default:
			       pResolver.setValue(object, "filterExpression", "default");
			}
			return updateMeasures(object,data);
		}

	function updateFilterSetExpression(object, data) {

			data.properties.kfModifierList.forEach(function (kfMod, modKey) {

				var filterSetExpression = "{$<"

				filterSetExpression += kfMod.kfFilterSetList.map(function(d) {
					return d.filterExpression;
				}).join(",");

				filterSetExpression += ">}"

				pResolver.setValue(kfMod, "kfFilterSetExpression", filterSetExpression);

			});

			return true;
		}

		
	function l(b, d) {
			return pResolver.getValue(b, "qNumFormat.qFmt") === numFormatting.getDefaultNumericFormat(b.qNumFormat, d ? d.localeInfo : "")
		}

		function m(b) {
			var c = pResolver.getValue(b, "qNumFormat.qType");
			return ["R", "M", "IV"].contains(c) || "U" !== c && pResolver.getValue(b, "numFormatFromTemplate", !0) === !1
		}

	return {
		initialProperties : {
			version: 1.0,
			qFieldListDef: {
				qShowSystem: false,
				qShowHidden: false,
				qShowSrcTables: true,
				qShowSemantic: true
			},
			qHyperCubeDef : {
				qDimensions : [],
				qMeasures : [],
				qInterColumnSortOrder : [],
				qInitialDataFetch : [{
					qWidth : 100,
					qHeight : 100
				}]
			},
			KFDimensions : [],
			selectionMode : "CONFIRM"
		},
		definition : {
			type : "items",
			component : "accordion",
			items : {
				dimensions : {
					uses : "dimensions",
					min : 1,
					max : 1
				},
				kfMeasureListHead: {
					label: "Row measures",
					type: "items",
					items : {
						measureLabel: {
								type: "string",
								ref: "kfMeasureListLabel",
								label: "Label",
								show: true,
								defaultValue: ""
						},
						kfMeasuresDirty: {
							type: "boolean",
							ref: "kfMeasuresDirty",
							defaultValue: false,
							show: false
						}, 
						kfMeasureList: 	{
							type: "array",
							translation: "Row measures",
							ref: "kfMeasureList",
							min: 1,
							allowAdd: true,
							allowRemove: true,
							allowMove: false,
							addTranslation: "Add row measure",
							grouped: true,
							sourceType: "kfMeasure",
							itemTitleRef: "label",
							items: {
								rowLabel: {
									type: "string",
									ref: "label",
									label: "Label",
									show: true,
									defaultValue: ""
								},
								rowMeasure : {
									type : "string",
									expression : "always",
									expressionType : "measure",
									ref : "qDef",
									label : "Measure",
									defaultValue : "",
									change : function(a,b) {
											console.log(a);
											console.log(b);
											if (a.label == '') {
												a.label = a.qDef
											};
											return updateMeasures(a,b);
									}
								},
								kfMeasuresType : {
									type: "boolean",
									component: "switch",
									label: "Expression type",
									ref: "kfMeasuresType",
									defaultValue: false,
									options: [{
										value: false,
										translation: "properties.numberFormatting.simple"
									}, {
										value: true,
										translation: "Advanced"
									}]
								}, 
								kfAdvancedExpDiscription: {
									component: "text",
									translation: "Use #Set where you want the column modifier to be inserted. Use #filters instead if you want the column modifier to be inserted into an existing set analysis. Can be used multiple times in an expression.",
									show: function(a) {
										return a.kfMeasuresType
									}
								},
								numberFormatting: {
									type: "items",
									items: {
										numberFormattingType: {
											type: "string",
											component: "dropdown",
											ref: "qNumFormat.qType",
											translation: "properties.numberFormatting",
											defaultValue: "U",
											options: [{
												value: "U",
												translation: "Common.Auto"
											}, {
												value: "F",
												translation: "properties.numberFormatting.types.number"
											}, {
												value: "M",
												translation: "properties.numberFormatting.types.money"
											}, {
												value: "D",
												translation: "properties.numberFormatting.types.date"
											}, {
												value: "IV",
												translation: "properties.numberFormatting.types.duration"
											}, {
												value: "R",
												translation: "Common.Custom"
											}],
											change: function(a, b, d, e) {
												numFormatting.setNumFmtPattern("qType", a.qNumFormat, e.localeInfo)
											}
										},
										numberFormattingMode: {
											type: "boolean",
											component: "switch",
											ref: "numFormatFromTemplate",
											translation: "properties.numberFormatting.formatting",
											defaultValue: !0,
											options: [{
												value: !0,
												translation: "properties.numberFormatting.simple"
											}, {
												value: !1,
												translation: "Common.Custom"
											}],
											show: function(b) {
												return ["F", "D", "TS", "T"].contains(pResolver.getValue(b, "qNumFormat.qType"))
											}
										},
										numberFormattingTemplates: {
											type: "string",
											component: "number-formatter-dropdown",
											ref: "qNumFormat.qFmt",
											defaultValue: "#,##0",
											show: function(b) {
												var c = pResolver.getValue(b, "qNumFormat.qType");
												return ["F", "D", "TS", "T"].contains(c) && pResolver.getValue(b, "numFormatFromTemplate", !0) === !0
											},
											filter: function(b) {
												return [pResolver.getValue(b, "qNumFormat.qType", "F")]
											}
										},
										numDecimals: {
											type: "integer",
											ref: "qNumFormat.qnDec",
											translation: "properties.numberFormatting.nDec",
											defaultValue: 2,
											min: 0,
											max: 14,
											show: !1
										},
										numPrecisionDigits: {
											type: "integer",
											ref: "qNumFormat.qnDec",
											translation: "properties.numberFormatting.significantFigures",
											defaultValue: 10,
											min: 1,
											max: 14,
											show: !1
										},
										decimalSep: {
											type: "string",
											ref: "qNumFormat.qDec",
											translation: "properties.numberFormatting.dec",
											defaultValue: ".",
											show: function(b) {
												var c = pResolver.getValue(b, "qNumFormat.qType");
												return "R" === c
											},
											change: function(a, b, d, e) {
												numFormatting.setNumFmtPattern("qDec", pResolver.qDef.qNumFormat, e.localeInfo)
											},
											invalid: function(b) {
												return pResolver.getValue(b, "qNumFormat.qDec") === pResolver.getValue(b, "qNumFormat.qThou")
											},
											readOnly: function(a, b, c, d) {
												return !l(a, d)
											}
										},
										thousandSep: {
											type: "string",
											ref: "qNumFormat.qThou",
											translation: "properties.numberFormatting.thousandSeparator",
											defaultValue: "",
											show: function(b) {
												var c = pResolver.getValue(b, "qNumFormat.qType");
												return "R" === c
											},
											change: function(a, b, d, e) {
												numFormatting.setNumFmtPattern("qThou", pResolver.qDef.qNumFormat, e.localeInfo)
											},
											invalid: function(b) {
												var c = pResolver.getValue(b, "qNumFormat.qType");
												return "I" === c ? !1 : pResolver.getValue(b, "qNumFormat.qDec") === pResolver.getValue(b, "qNumFormat.qThou")
											},
											readOnly: function(a, b, c, d) {
												return !l(a, d)
											}
										},
										format: {
											type: "string",
											component: "number-formatter",
											ref: "qNumFormat.qFmt",
											resetTranslation: "properties.numberFormatting.resetPattern",
											translation: "properties.numberFormatting.formatPattern",
											defaultValue: "",
											show: function(a) {
												return m(a)
											},
											invalid: function(a, b, c) {
												if (["D", "T", "TS", "IV"].contains(a.qNumFormat.qType)) return !1;
												var d = "R" === a.qNumFormat.qType ? a.qNumFormat.qDec : c.localeInfo["q" + ("M" === a.qNumFormat.qType ? "Money" : "") + "DecimalSep"],
													e = new RegExp("(0|#)" + util.escapeRegExp(d) + "0*#*"),
													f = (a.qNumFormat.qFmt || "").split(";"),
													h = f[0].match(e),
													i = h && h[0] ? h[0].length - 2 : 0,
													j = f[1] ? f[1].match(e) : null,
													k = j && j[0] ? j[0].length - 2 : 0;
												return i > 15 || k > 15
											}
										}
									}
								}
							},
							change : function(a,b) {
											return updateMeasures(a,b);
							},
							remove : function(a,b,c) {
											console.log("measure remove:");
											return updateMeasures(a,c);
							}
						}
					}
				},
				kfmodifiers: 	{
					type: "array",
					translation: "Column modifiers",
					ref: "kfModifierList",
					min: 1,
					allowAdd: true,
					allowRemove: true,
					allowMove: false,
					addTranslation: "Add column modifier",
					grouped: true,
					sourceType: "kfModifier",
					itemTitleRef: "label",
					items: {
						modifierLabel: {
							type: "string",
							ref: "label",
							label: "Label",
							expression: "optional",
							show: true,
							defaultValue: ""
						},
						modifierType: {
							component: "dropdown",
							ref: "kfModifierType",
							translation: "Modifier type",
							options: [{
								value: 0,
								label: "Set"
							}, {
								value: 1,
								label: "Filter set"
							}, {
								value: 2,
								label: "Column expression"
							}],
							show: true,
							defaultValue: 1,
							change : function(a,b) {
									console.log("modifier type change:");
									console.log(a);
									console.log(b);
									if (a.kfSet == "") {
										pResolver.setValue(a, "kfSet", a.kfFilterSetExpression); 
			        				};
									return updateMeasures(a,b);
							}
						},
						kfSet : {
							type : "string",
							expression : "always",
							ref : "kfSet",
							label : "Set",
							defaultValue : "",
							show: function(a) {
								console.log("show set:");
								console.log(a);
								console.log(a.kfModifierType == 0);
								return (a.kfModifierType == 0);
							},
							change : function(a,b) {
									return updateMeasures(a,b);
							}
						},
						kfSetDiscription: {
							component: "text",
							translation: "Set with this format {$<...>} is only supported in this version",
							show: function(a) {
								return (a.kfModifierType == 0);
							}
						},
						kfColumnExp : {
							type : "string",
							expression : "always",
							expressionType : "measure",
							ref : "kfColumnExp",
							label : "Column expression",
							defaultValue : "",
							show: function(a) {
									return (a.kfModifierType == 2);
							},
							change : function(a,b) {
									return updateMeasures(a,b);
							}
						},
						kfFilterSet: 	{
							type: "array",
							translation: "Filters",
							ref: "kfFilterSetList",
							min: 1,
							allowAdd: true,
							allowRemove: true,
							allowMove: false,
							addTranslation: "Add filter",
							grouped: true,
							sourceType: "kfFilter",
							itemTitleRef: "filterExpression",
							items: {
								filterExpression: {
									type: "string",
									ref: "filterExpression",
									label: "Expression",
									show: false,
									defaultValue: "",
									readOnly: true
								},
								field : {
									type : "string",
									expression : "always",
									expressionType : "field",
									ref : "field",
									label : "Field",
									change : function(a,b) {
										updateFilterExpression(a,b);
										return updateFilterSetExpression(a,b);
									}
								},
								filterType: {
									component: "dropdown",
									ref: "kfFilterType",
									translation: "Modifier type",
									options: [{
										value: 0,
										label: "Ignore selections in field"
									}, {
										value: 1,
										label: "Equal to"
									}, {
										value: 2,
										label: "Not equal to"
									}, {
										value: 3,
										label: "Range"
									}],
									show: true,
									defaultValue: 1,
									change : function(a,b) {
										console.log("updateFilterType");
										updateFilterExpression(a,b);
										return updateFilterSetExpression(a,b);
									}
								},
								values : {
									type : "string",
									ref : "values",
									label : "Values",
									show: function(a) {
										return (a.kfFilterType == 1 || a.kfFilterType == 2);
									},
									change : function(a,b) {
										updateFilterExpression(a,b);
										return updateFilterSetExpression(a,b);
									}
								},
								rangeFrom : {
									type : "string",
									ref : "rangeFrom",
									label : "Range from (>=)",
									show: function(a) {
										return (a.kfFilterType == 3);
									},
									change : function(a,b) {
										updateFilterExpression(a,b);
										return updateFilterSetExpression(a,b);
									}
								},
								rangeTo : {
									type : "string",
									ref : "rangeTo",
									label : "Range to (<=)",
									show: function(a) {
										return (a.kfFilterType == 3);
									},
									change : function(a,b) {
										updateFilterExpression(a,b);
										return updateFilterSetExpression(a,b);
									}
								}
							},
							show: function(a) {
									return (a.kfModifierType == 1);
							}
						},
						kfFilterSetExpression : {
									label: "Filter set expression",
									type: "string",
									ref: "kfFilterSetExpression",
									defaultValue: "",
									show: function(a) {
										return (a.kfModifierType == 1);
									},
									change : function(a,b) {
										return updateFilterSetExpression(a,b);
									}
						}, 
						kfModifierHide : {
									label: "Hide column",
									type: "boolean",
									ref: "kfModifierHide",
									defaultValue: false
						}, 
						numberFormatting: {
							type: "items",
							items: {
								numberFormattingType: {
									type: "string",
									component: "dropdown",
									ref: "qNumFormat.qType",
									translation: "properties.numberFormatting",
									defaultValue: "U",
									options: [{
										value: "U",
										translation: "Common.Auto"
									}, {
										value: "F",
										translation: "properties.numberFormatting.types.number"
									}, {
										value: "M",
										translation: "properties.numberFormatting.types.money"
									}, {
										value: "D",
										translation: "properties.numberFormatting.types.date"
									}, {
										value: "IV",
										translation: "properties.numberFormatting.types.duration"
									}, {
										value: "R",
										translation: "Common.Custom"
									}],
									change: function(a, b, d, e) {
										numFormatting.setNumFmtPattern("qType", a.qNumFormat, e.localeInfo)
									}
								},
								numberFormattingMode: {
									type: "boolean",
									component: "switch",
									ref: "numFormatFromTemplate",
									translation: "properties.numberFormatting.formatting",
									defaultValue: !0,
									options: [{
										value: !0,
										translation: "properties.numberFormatting.simple"
									}, {
										value: !1,
										translation: "Common.Custom"
									}],
									show: function(b) {
										return ["F", "D", "TS", "T"].contains(pResolver.getValue(b, "qNumFormat.qType"))
									}
								},
								numberFormattingTemplates: {
									type: "string",
									component: "number-formatter-dropdown",
									ref: "qNumFormat.qFmt",
									defaultValue: "#,##0",
									show: function(b) {
										var c = pResolver.getValue(b, "qNumFormat.qType");
										return ["F", "D", "TS", "T"].contains(c) && pResolver.getValue(b, "numFormatFromTemplate", !0) === !0
									},
									filter: function(b) {
										return [pResolver.getValue(b, "qNumFormat.qType", "F")]
									}
								},
								numDecimals: {
									type: "integer",
									ref: "qNumFormat.qnDec",
									translation: "properties.numberFormatting.nDec",
									defaultValue: 2,
									min: 0,
									max: 14,
									show: !1
								},
								numPrecisionDigits: {
									type: "integer",
									ref: "qNumFormat.qnDec",
									translation: "properties.numberFormatting.significantFigures",
									defaultValue: 10,
									min: 1,
									max: 14,
									show: !1
								},
								decimalSep: {
									type: "string",
									ref: "qNumFormat.qDec",
									translation: "properties.numberFormatting.dec",
									defaultValue: ".",
									show: function(b) {
										var c = pResolver.getValue(b, "qNumFormat.qType");
										return "R" === c
									},
									change: function(a, b, d, e) {
										numFormatting.setNumFmtPattern("qDec", pResolver.qDef.qNumFormat, e.localeInfo)
									},
									invalid: function(b) {
										return pResolver.getValue(b, "qNumFormat.qDec") === pResolver.getValue(b, "qNumFormat.qThou")
									},
									readOnly: function(a, b, c, d) {
										return !l(a, d)
									}
								},
								thousandSep: {
									type: "string",
									ref: "qNumFormat.qThou",
									translation: "properties.numberFormatting.thousandSeparator",
									defaultValue: "",
									show: function(b) {
										var c = pResolver.getValue(b, "qNumFormat.qType");
										return "R" === c
									},
									change: function(a, b, d, e) {
										numFormatting.setNumFmtPattern("qThou", pResolver.qDef.qNumFormat, e.localeInfo)
									},
									invalid: function(b) {
										var c = pResolver.getValue(b, "qNumFormat.qType");
										return "I" === c ? !1 : pResolver.getValue(b, "qNumFormat.qDec") === pResolver.getValue(b, "qNumFormat.qThou")
									},
									readOnly: function(a, b, c, d) {
										return !l(a, d)
									}
								},
								format: {
									type: "string",
									component: "number-formatter",
									ref: "qNumFormat.qFmt",
									resetTranslation: "properties.numberFormatting.resetPattern",
									translation: "properties.numberFormatting.formatPattern",
									defaultValue: "",
									show: function(a) {
										return m(a)
									},
									invalid: function(a, b, c) {
										if (["D", "T", "TS", "IV"].contains(a.qNumFormat.qType)) return !1;
										var d = "R" === a.qNumFormat.qType ? a.qNumFormat.qDec : c.localeInfo["q" + ("M" === a.qNumFormat.qType ? "Money" : "") + "DecimalSep"],
											e = new RegExp("(0|#)" + util.escapeRegExp(d) + "0*#*"),
											f = (a.qNumFormat.qFmt || "").split(";"),
											h = f[0].match(e),
											i = h && h[0] ? h[0].length - 2 : 0,
											j = f[1] ? f[1].match(e) : null,
											k = j && j[0] ? j[0].length - 2 : 0;
										return i > 15 || k > 15
									}
								}
							}
						}
					},
					change : function(a,b) {
									console.log("modifier change:");
									return updateMeasures(a,b);
					},
					remove : function(a,b,c) {
									console.log("modifier remove:");
									return updateMeasures(a,c);
					}
				},
				sorting : {
					uses : "sorting"
				},
				settings : {
					uses : "settings",
					items : {
						initFetchRows : {
							ref : "qHyperCubeDef.qInitialDataFetch.0.qHeight",
							label : "Initial fetch rows",
							type : "number",
							defaultValue : 100
						},
						selection : {
							type : "string",
							component : "dropdown",
							label : "Selection mode",
							ref : "selectionMode",
							options : [{
								value : "NO",
								label : "No selections"
							}, {
								value : "CONFIRM",
								label : "Confirm selections"
							}, {
								value : "QUICK",
								label : "Quick selection"
							}]
						}
					}
				}
			}
		},
		snapshot : {
			canTakeSnapshot : true
		},
		paint : function($element, layout) {

			var getColumnNumbers = function(s) {
			  var r=/column\((.*?)\)/gi, a=[], m;
			  while (m = r.exec(s)) {
			    a.push(Number(m[1]));
			  }
			  return a;
			};

			var me = this;  
			this.backendApi.getProperties().then(function(reply){ 
				//remove old measures
				reply.qHyperCubeDef.qMeasures.length = 0;
				//loop through all rows and columns and create a measure for each combination
				reply.kfMeasureList.forEach(function (kfMea,meaKey) {
					reply.kfModifierList.forEach(function (kfMod, modKey) {
						var qDefString = kfMea.qDef;
						var columnExpString = kfMod.kfColumnExp;
						var kfFiltersString = '';
						var modifierLength = reply.kfModifierList.length;
						
						if (!kfMea.kfMeasuresType) {
							qDefString = qDefString.replace(/Sum\(/g, "Sum(#Set ")
										 .replace(/Avg\(/g, "Avg(#Set ")
										 .replace(/Count\(/g, "Count(#Set ")
										 .replace(/Max\(/g, "Max(#Set ")
										 .replace(/Min\(/g, "Min(#Set ");
						};

						switch(kfMod.kfModifierType) {
	    					case 0: //set
						        qDefString = qDefString.replace(/#set/gi,"{$< #filters >}")
						        					   .replace(/#filters/gi,kfMod.kfSet.replace("{$<","")).replace(">}","");
						        break;
						    case 1: //filter set
						    	qDefString = qDefString.replace(/#set/gi,"{$< #filters >}")
						    						   .replace(/#filters/gi,kfMod.kfFilterSetList.map(function (d) {
						    								return d.filterExpression;
						    							}).join(','));
								break;
						    case 2: //column expession
						    	var columnsNum = getColumnNumbers(kfMod.kfColumnExp).map(function (d){
									return {
							           	"origNum":d,
							            "newNum":(meaKey * modifierLength) + d
							        }
								});
								columnsNum.forEach(function (num, numKey) {
									var regEx = "/Column\(" + num.origNum + "\)/gi";
									columnExpString = columnExpString.replace(regEx, "Column(" + num.newNum + ")");
								});
								qDefString = columnExpString;
						        break;
						    default:
						       qDefString = qDefString.replace(/#set/gi,"");
						}
						//column format overwrite row formats
						var numFormat = kfMod.qNumFormat.qType == "U" ? kfMea.qNumFormat : kfMod.qNumFormat
						
						reply.qHyperCubeDef.qMeasures.push({qDef: {
															 qDef : qDefString,
															 qLabel : kfMea.label + '-' + kfMod.label,
															 qNumFormat : numFormat
															}
														});
					});
				});
				me.backendApi.setProperties(reply);
			}); 
			

			var html = "<table><thead><tr>", 
				self = this,
				lastrow = 0, 
				morebutton = false,
				measureLength = layout.kfMeasureList.length,
				modifierLength = layout.kfModifierList.length;

			//render titles
			$.each(this.backendApi.getDimensionInfos(), function(key, value) {
				html += '<th>' + value.qFallbackTitle + '</th>';
			});

				html += '<th>' + layout.kfMeasureListLabel + '</th>';

			$.each(layout.kfModifierList, function(key, value) {
				if (!value.kfModifierHide) {
					html += '<th>' + value.label + '</th>'
				};
			});
			html += "</tr></thead><tbody>";
			//render data
			this.backendApi.eachDataRow(function(rownum, row) {

				lastrow = rownum;
				html += '<tr><td rowspan =' + measureLength  + ' data-value=' + row[0].qElemNumber;
				if(!isNaN(row[0].qNum)) {
						html += " class='numeric'";
					}
				html += '>' + row[0].qText + '</td>';	

				for (var i = 0 ; i < measureLength; i++) {
					html += '<td>' + layout.kfMeasureList[i].label; + '</td>';
					
					for (var j = 1 ; j < modifierLength + 1; j++) {
						var index = (i * modifierLength) + j; 
						if (!layout.kfModifierList[j-1].kfModifierHide) {
							html += '<td';
							if(!isNaN(row[index].qNum)) {
								html += " class='numeric'";
							}
							html += '>' + row[index].qText + '</td>';	
						};
					}
					html += '</tr><tr>';
				};
				
				html += '</tr>';
			});
			html += "</tbody></table>";
			//add 'more...' button
			if(this.backendApi.getRowCount() > lastrow + 1) {
				html += "<button id='more'>More...</button>";
				morebutton = true;
			}
			$element.html(html);
			if(morebutton) {
				var requestPage = [{
					qTop : lastrow + 1,
					qLeft : 0,
					qWidth : 100, //should be # of columns
					qHeight : Math.min(100, this.backendApi.getRowCount() - lastrow)
				}];
				$element.find("#more").on("qv-activate", function() {
					self.backendApi.getData(requestPage).then(function(dataPages) {
						self.paint($element, layout);
					});
				});
			}

			if(this.selectionsEnabled && layout.selectionMode !== "NO") {
				$element.find('td').on('qv-activate', function() {
					if(this.hasAttribute("data-value")) {
						var value = parseInt(this.getAttribute("data-value"), 10), dim = 0;
						if(layout.selectionMode === "CONFIRM") {
							self.selectValues(dim, [value], false);
							$(this).toggleClass("selected");
						} else {
							self.backendApi.selectValues(dim, [value], true);
						}
					}
				});
			}
		}
	};
});
