import { Component, ComponentFactoryResolver, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { AppLayoutService } from 'src/app/app-layout/app-layout.service';
import { TableViewService } from 'src/app/app-widgets/table/table-view/table-view.service';
import { APP_URL } from 'src/app/common/app-urls/app-urls';
import { LovFetcherService } from 'src/app/common/lov-fetcher/lov-fetcher.service';
import { environment } from 'src/environments/environment';
import { RulesService } from '../../rules.service';
import { ServiceResponse } from 'src/app/common/service-response';
import { DatePipe, Location } from '@angular/common';
import swal from 'sweetalert2';
import { format } from 'date-fns';

@Component({
  selector: 'app-qual-criteria-view',
  templateUrl: './qual-criteria-view.component.html',
  styleUrls: ['./qual-criteria-view.component.css']
})
export class QualCriteriaViewComponent implements OnInit {
  rulesObj: any;
  rulesObjCopy: any;
  lovDataObj: any;
  selRulesList: Array<any> = [];
  hideBreadCrumb: Boolean = false;
  disableForm: Boolean = false;
  hidePublish: Boolean = false;
  publishDate: any;
  comment: string = '';
  is_published: Boolean = false;
  is_admin: boolean = false;
  category_id: any;
  plan_category_id: any;

  combination_rules: Array<object> = [];
  insurance_category: object = {};
  insurance_plan_category: object = {};
  selected_combinations: object = {};
  show_inputs: boolean = false;
  show_table: boolean = false;

  selectCombIndex: number = null;
  selInsCategory: string = null;
  selInsPlanCategory: string = null;

  combination_data = [];
  add_new_rule: boolean = false;
  constructor(
    private _router: Router,
    private _lovService: LovFetcherService,
    private _spinnerService: NgxSpinnerService,
    private _rulesService: RulesService,
    private _tableService: TableViewService,
    private _layoutService: AppLayoutService,
    private _matSnackbar: MatSnackBar,
    private _location: Location
  ) {
    let navData = this._router.getCurrentNavigation();
    if (navData && navData.extras && navData.extras.state && navData.extras.state.add_new_rule) {
      this.add_new_rule = navData.extras.state.add_new_rule;
    }
  }

  ngOnInit(): void {
    let roleList = this._layoutService.user && this._layoutService.user['roleList'] ? this._layoutService.user['roleList'] : [];
    if (roleList) {
      let index = roleList.findIndex(item => item.name == "CQRWorld Admin");
      if (index != -1) {
        this.hidePublish = true;
        this.is_admin = true;
      }
    }
    this.publishDate = format(new Date(), 'dd/MM/yyyy');
    this.getLovData();
  }
  ngOnDestroy(): void {
    this._tableService.selRecord = null;
  }

  private getLovData() {

    this._spinnerService.show();
    let _url = environment.baseUrl + APP_URL.BUSINESS_LOV_PROCESS_RULES;
    this._lovService.getLovList(_url).subscribe(res => {
      //this._spinnerService.hide();
      if (this.add_new_rule) {
        this.fecthNewRule();
      } else if (this._tableService.selRecord && this._tableService.selRecord['id']) {
        this.fetchEditRules();
      } else {
        this.fetchRules();
      }
      if (res.status === ServiceResponse.STATUS_SUCCESS) {

        let data = res.response.data;
        this.lovDataObj = data;
        this.category_id = this.lovDataObj['insuranceCategory']['id'];
        this.plan_category_id = this.lovDataObj['insurancePlanCategory']['id'];
        this.lovDataObj['insuranceCategory']['data'].forEach(element => {
          this.insurance_category[element.id] = element.itemName;
        });
        this.lovDataObj['insurancePlanCategory']['data'].forEach(element => {
          this.insurance_plan_category[element.id] = element.itemName;
        });

        // this.headerList = [
        //   { displayName: "Insurance Category", name: "category_name", type: "string" },
        //   { displayName: "Insurance Plan Category", name: "plan_category_name", type: "string" },
        //   { displayName: "Actions", name: "actions", type: "options" }
        // ];

        // if (this.is_admin) {
        //   this.headerList.splice(this.headerList.length - 1, 0, { displayName: "Ready to Publish", name: "published", type: "string" });
        // }

      } else {
        swal.fire({ text: res.error, icon: 'error' });
      }
    });
  }

  fecthNewRule() {
    this._spinnerService.show();
    let _url = environment.baseUrl + APP_URL.ADD_NEW_RULE;
    let body = {
      iprRuleType: "qualif-criteria"
    };
    this._rulesService.saveRules(_url, body).subscribe((res) => {
      this._spinnerService.hide();
      if (res.status === ServiceResponse.STATUS_SUCCESS) {
        let data = res.response.data;
        this.rulesObj = JSON.parse(JSON.stringify(data));
        this.rulesObjCopy = JSON.parse(JSON.stringify(data));
        this.updateDataByComb();
        if ((this.rulesObj['currentState'] == 'Active' || this.rulesObj['currentState'] == 'InActive') && this.is_admin) {
          this.disableForm = true;
        }
      } else {
        swal.fire({ text: res.error, icon: 'error' });
      }
    }, (err) => {
      this._spinnerService.hide();
    })
  }


  fetchRules() {

    this._spinnerService.show();
    let _url = environment.baseUrl + APP_URL.BUSINESS_RULES_FETCH;

    let _formData = {};
    _formData['iprRuleType'] = 'qualif-criteria';
    this._rulesService.fetchRules(_url, _formData).subscribe(res => {
      this._spinnerService.hide();
      if (res.status === ServiceResponse.STATUS_SUCCESS) {
        let data = res.response.data;
        this.rulesObj = JSON.parse(JSON.stringify(data));
        this.rulesObjCopy = JSON.parse(JSON.stringify(data));
        this.updateDataByComb();

        if ((this.rulesObj['currentState'] == 'Active' || this.rulesObj['currentState'] == 'InActive') && this.is_admin) {
          this.disableForm = true;
        }
        this._spinnerService.hide();
      } else {
        swal.fire({ text: res.error, icon: 'error' });
        this._spinnerService.hide();
      }
    });
  }

  validForms() {
    let formValid = false;
    let message = '';
    for (let i = 0; i < this.combination_rules[this.selectCombIndex]['ruleList'].length; i++) {
      for (let j = 0; j < this.combination_rules[this.selectCombIndex]['ruleList'][i]['iprRulesOpList'].length; j++) {
        if (this.combination_rules[this.selectCombIndex]['ruleList'][i]['iprRulesOpList'][j]['value']) {
          formValid = true;
        } else {
          formValid = false;
          message = 'Please filled all values';
          break;
        }
      }
      if (!formValid) {
        break;
      }
    }
    return { valid: formValid, message };

  }
  fetchEditRules() {
    this._spinnerService.show();
    let data = this._tableService.selRecord;

    let _url = environment.baseUrl + APP_URL.FETCH_IPR_RULE;
    let _formData = {
      id: data['id'],
      currentState: data["currentState"],
      itemType: "com.dev.cqr.models.user.Organization"
    };
    this._rulesService.fetchRulePost(_url, _formData).subscribe(res => {
      if (res.status === ServiceResponse.STATUS_SUCCESS) {

        let data = res.response.data;
        this.comment = res.response.remarks;

        this.rulesObj = JSON.parse(JSON.stringify(data));
        this.rulesObjCopy = JSON.parse(JSON.stringify(data));
        if ((this.rulesObj['currentState'] == 'Active' || this.rulesObj['currentState'] == 'InActive') && this.is_admin) {
          this.disableForm = true;
        }
        this.updateDataByComb();
        this._spinnerService.hide();

      } else {
        this._spinnerService.hide();
      }

    }, (err) => {
      this._spinnerService.hide();
    });
  }
  handleMenu = (row) => {
    this._tableService.selRecord = row;
    for (let i = 0; i < this.combination_rules.length; i++) {
      if (this.combination_rules[i]["field1Value"] == this._tableService.selRecord["field1Value"] && this.combination_rules[i]["field2Value"] == this._tableService.selRecord["field2Value"]) {
        this.selectCombIndex = i;
        this.show_inputs = true;
        this.selInsCategory = this._tableService.selRecord["category_name"];
        this.selInsPlanCategory = this._tableService.selRecord["plan_category_name"];
        break;
      }
    }
  }

  onBeforeRuleSave() {
    let formValid = this.validForms();
    if (!formValid.valid) {
      this._matSnackbar.open(formValid.message, "Dismiss", {
        duration: 2000,
      });
      return false;
    }

    if (this.add_new_rule) {
      swal.fire({
        title: 'Are you sure?',
        text: "On clicking yes, new system rules will be added and you won't be able to revert",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Add',
        cancelButtonText: "Cancel"
      }).then((result) => {
        if (result.isConfirmed) {
          this.saveRules();
        }
      });
    } else {
      this.saveRules();
    }
  }

  onBeforePublished() {
    let validation = this.validForms();
    if (!validation.valid) {
      this._matSnackbar.open(validation.message, "Dismiss", {
        duration: 2000,
      });
      return false;
    }
    if (!this.comment) {
      this._matSnackbar.open("Please enter comment.", "Dismiss", {
        duration: 2000,
      });
      return false;
    }
    this._spinnerService.show();
    let _url = environment.baseUrl + APP_URL.FETCH_IPR_RULE;

    let _formData = {
      ruleType: this.rulesObj.ruleType,
      itemId: this.rulesObj.itemId,
      currentState: 'Active',
      itemType: this.rulesObj.itemType
    };
    this._rulesService.fetchRulePost(_url, _formData).subscribe(res => {
      this._spinnerService.hide();
      if (res.status === ServiceResponse.STATUS_SUCCESS) {
        let activeRule = res.response.data;
        let presentActiveRule = activeRule['rulesCombList'];
        let currentRule = this.combination_rules;
        let ruleCheck = false;
        for (let i = 0; i < presentActiveRule.length; i++) {
          for (let j = 0; j < presentActiveRule[i]['ruleList'].length; j++) {
            for (let k = 0; k < presentActiveRule[i]['ruleList'][j]['iprRulesOpList'].length; k++) {
              if (presentActiveRule[i]['ruleList'][j]['iprRulesOpList'][k]['value'] == currentRule[i]['ruleList'][j]['iprRulesOpList'][k]['value']) {
                ruleCheck = false;
              } else {
                ruleCheck = true;
                break;
              }
            }
            if (ruleCheck)
              break;
          }
          if (ruleCheck)
            break;
        }
        if (ruleCheck) {
          swal.fire({
            text: "Whether you want to Submit – YES or NO.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes',
            cancelButtonText: "No"
          }).then((result) => {
            if (result.isConfirmed) {
              this.publishRule(this.comment);
            }
          });
        } else {
          this._matSnackbar.open("Previous rules have same values.", "Dismiss", {
            duration: 2000,
          });
        }
      }
    });
  }

  backProcess() {

    if (!this.is_admin) {
      this._router.navigate(['request-dashboard']);
    }
    else {
      this._location.back();
    }
  }

  markChangeValues() {
    this.rulesObj['rulesCombList'].forEach((combination, i) => {
      let ruleCount = 0;
      combination['ruleList'].forEach((rules, j) => {
        let iprCount = 0;
        rules['iprRulesOpList'].forEach((opr, k) => {
          if (opr.value != this.rulesObjCopy['rulesCombList'][i]['ruleList'][j]['iprRulesOpList'][k]['value']) {
            opr['isChange'] = true;
            iprCount += 1;
          }
        });
        if (iprCount > 0) {
          rules['isChange'] = true;
          ruleCount += 1;
        }
      });
      if (ruleCount > 0) {
        combination['isChange'] = true;
      }
    });
  }

  saveRules() {

    this.rulesObj["rulesCombList"] = JSON.parse(JSON.stringify(this.combination_rules));
    this.markChangeValues();
    this._spinnerService.show();
    let _url = environment.baseUrl + APP_URL.BUSINESS_SAVE_RULES;
    
    let reqData=this.rulesObj;

    if(this.is_admin){
    
      _url=environment.baseUrl + APP_URL.BUSINESS_SAVE_RULES_WITH_DATA;
      reqData={"reqData":this.rulesObj,"remarks":this.comment};
    
    }

    this._rulesService.saveRules(_url, reqData).subscribe(res => {

      this._spinnerService.hide();

      if (this.add_new_rule) {
        this.rulesObj = JSON.parse(JSON.stringify(res.response));
        this.add_new_rule = false;
      }

      if (res.status === ServiceResponse.STATUS_SUCCESS) {

        swal.fire({
          text: 'Qualification Criteria rules saved successsfully',
          icon: 'success'

        }).then(() => {

          if (!this.is_admin) {
            this._router.navigate(['request-dashboard']);
          }
        });
      } else {
        swal.fire({ text: res.error, icon: 'error' });
      }
    });
  }

  getTableData(combList) {
    if (combList) {
      this.category_id = this.lovDataObj['insuranceCategory']['id'];
      this.plan_category_id = this.lovDataObj['insurancePlanCategory']['id'];

      let catMap = this.getLovItemMap(this.lovDataObj['insuranceCategory']["data"]);
      let planCatMap = this.getLovItemMap(this.lovDataObj['insurancePlanCategory']["data"]);
      let tableData = [];
      for (let comb of combList) {
        if (!catMap.get(comb["field1Value"]) || !planCatMap.get(comb["field2Value"])) {
          continue;
        }
        let row = {
          "category_name": catMap.get(comb["field1Value"]),
          "plan_category_name": planCatMap.get(comb["field2Value"]),
          "published": comb["isPublishable"] == true ? "Yes" : "No",
          "field1Value": comb["field1Value"],
          "field2Value": comb["field2Value"],
          "isChange": comb['isChange']
        };

        tableData.push(row);
      }
      return tableData;
    }
    else {
      return [];
    }
  }

  createTable() {
    // let tableData = this.getTableData(this.combination_rules);
    this.combination_data = this.getTableData(this.combination_rules);
    // this.emitTableData(tableData, config);
    if (this.combination_data.length > -1) {
      this._tableService.selRecord = this.combination_data[0];
      this.handleMenu(this._tableService.selRecord);
    }

  }
  getLovItemMap(lovItems) {
    if (lovItems) {
      let itemMap = new Map();
      for (let item of lovItems) {
        itemMap.set(item["id"], item["itemName"]);
      }
      return itemMap;
    } else {
      return new Map();
    }
  }

  updateDataByComb() {
    if (this.rulesObj['rulesCombList']) {
      this.combination_rules = JSON.parse(JSON.stringify(this.rulesObj['rulesCombList']));
      this.comment = this.rulesObj["remarks"];
      if (this.combination_rules.length > 0) {
        this.selectCombIndex = 1;
        this.show_inputs = true;
        this.onPublishChange();
      }

      this.createTable();
    }
  }

  publishRule(comment) {

    this._spinnerService.show();
    this.rulesObj["rulesCombList"] = JSON.parse(JSON.stringify(this.combination_rules));
    this.markChangeValues();
    let url = environment.baseUrl + APP_URL.PUBLISH_RULE;
    let postObj = {
      isPublish: true,
      remarks: comment,
      reqData: this.rulesObj
    };
    this._rulesService.saveRules(url, postObj).subscribe((data) => {
      if (data.status === ServiceResponse.STATUS_SUCCESS) {
        if (this.add_new_rule) {
          this.rulesObj = JSON.parse(JSON.stringify(data.response));
          this.add_new_rule = false;
        }
        swal.fire({
          text: 'Rules Published Successfully.',
          icon: 'success'
        }).then(() => {
          if (this.is_admin)
            this._router.navigate(['/qualfcriterias']);
        });
      } else {
        swal.fire({ text: data.error, icon: 'error' });
      }
      
      this._spinnerService.hide();
    }, (err) => {
      this._spinnerService.hide();
    })
  }

  onPublishChange($event = null) {
    if ($event && this.combination_rules[this.selectCombIndex]) {
      this.combination_rules[this.selectCombIndex]['isPublishable'] = $event["checked"];
    }

    for (let combTableRow of this.combination_data) {
      if (this.combination_rules[this.selectCombIndex]["field1Value"] == combTableRow["field1Value"] && this.combination_rules[this.selectCombIndex]["field2Value"] == combTableRow["field2Value"]) {
        combTableRow["published"] = (this.combination_rules[this.selectCombIndex]['isPublishable']) == true ? "Yes" : "No";
        break;
      }
    }

    let publishCount = this.combination_rules.filter(
      item => item["isPublishable"] == true
    ).length;
    if (this.combination_rules.length > 0 && publishCount == this.combination_rules.length - 1) {
      this.is_published = true;
    } else {
      this.is_published = false;
    }
  }
}
