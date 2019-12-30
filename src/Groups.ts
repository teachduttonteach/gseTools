import {SpreadsheetGS} from './SpreadsheetGS';
import {getDataSheet, setCache, getCache} from './Properties';

/**
 * Starts by reading in all students from sheet
 *  Each student becomes a StudentForGrouping object
 *  Each intersection becomes a StudentRelationship object
 */

/**
 * Class to hold student information for making groups
 */
 class StudentForGroups {
    private _name: string;
    private _number: number = 0;

    /**
     * 
     * @param name name of the student
     * @param number number of the row or column holding the student in the spreadsheet
     */
    constructor(name: string, number: number) {
      this._name = name;
      this._number = number;
    }

    /**
     * 
     * @param number number of the row or column holding the student in the spreadsheet
     */
    setNumber(number: number) {
      this._number = number;
    }

    /**
     * @returns name of the student
     */
    getName(): string {
      return this._name;
    }

    /**
     * @returns number (row or column) of the student
     */
    getNumber(): number {
      return this._number;
    }
}

/**
 * Class to hold a group of students
 * 
 */
class GroupOfStudents {
    private _students: Array<StudentForGroups>;
    private _limitStudentsPerGroup: number;

    /**
     * 
     * @param limitStudentsPerGroup the highet number of students allowed per group
     */
    constructor(limitStudentsPerGroup: number) {
      this._students = [];
      this._limitStudentsPerGroup = limitStudentsPerGroup;
    }

    /**
     * 
     * @param {StudentForGroups} student student to add to the group
     * @returns {boolean} whether or not student was added
     */
    addStudentIfPossible(student: StudentForGroups): boolean {
      if (this._students.length < this._limitStudentsPerGroup) {
        this.addStudent(student);
        return true;
      }
      return false;
    }

    studentInGroup(student: StudentForGroups): boolean {
      for (let s = 0; s < this._students.length; s++) {
        if (this._students[s] == student) return true;
      }
      return false;
    }

    addStudent(student: StudentForGroups): GroupOfStudents {
      this._students.push(student);
      return this;
    }

    getStudents(): Array<StudentForGroups> {
      return this._students;
    }
}

class GroupSet {
    private _groups: Array<GroupOfStudents>;
    private _score: number;

    constructor(numStudents: number, limitGroups: number) {
      // Initialize the group array
      this._groups = [];
      this._score = 0;

      // Loop through all of the groups to set the size of each
      // group
      for (let i = 0; i < limitGroups; i++) {
        // Initialize the group size to the minimum per group
        let groupSize = Math.floor(numStudents /
            (limitGroups - i));

        // Add one to the group size if there's an odd number of
        //  students for the remaining groups
        if (numStudents % (limitGroups - i) > 0) groupSize++;

        // Add a group with the specified number of students
        this._groups.push(new GroupOfStudents(groupSize));

        // Set the remaining number of students left to place
        numStudents -= groupSize;
      }
    }

    convertToStringArrays(): Array<Array<string>> {
      const t_return = [];
      for (const g of this._groups) {
        t_return.push(g.getStudents().map((x) => x.getName()));
      }
      return t_return;
    }

    convertToNumberArrays(): Array<Array<number>> {
      const t_return = [];
      for (const g of this._groups) {
        t_return.push(g.getStudents().map((x) => x.getNumber()));
      }
      return t_return;
    }

    getRandomGroup(): GroupOfStudents {
      return this._groups[Math.floor(Math.random() *
        this._groups.length)];
    }

    getScore(): number {
      return this._score;
    }

    setScore(s: number): number {
      return this._score = s;
    }

    addStudentToRandomGroup(student: StudentForGroups): GroupSet {
      while (!this.getRandomGroup().addStudentIfPossible(student)) { }
      return this;
    }

    getGroups(): Array<GroupOfStudents> {
      return this._groups;
    }
}

export type GroupParams = {
    className: string,
    numGroups?: number,
    sheetName?: string,
    spreadsheetColumn?: string,
    sheetNameColumn?: string,
    attemptedDepth?: number,
    acceptGroupsFunction?: string,
    calculateGroupsFunction?: string,
    sheetNameColumnName?: string
}

export type SidebarButton = {
    text: string,
    function: string,
    wait: boolean,
    close: boolean
}

export class GroupCreator {
    private _limitGroups: number;
    private _students: Array<StudentForGroups>;
    private _relationships: Array<Array<number>>;
    private _minimumGroupSet: GroupSet | undefined;
    private _args: GroupParams;

    constructor(args?: GroupParams) {
      if (args == null) this._args = {} as GroupParams;
      else this._args = args;

      const {
        numGroups = 5,
      } = this._args;

      this._limitGroups = numGroups;
      this._students = [];
      this._relationships = [];
    }

    calculateScore(set: GroupSet): number {
      let totalScore = 0;
      for (const group of set.getGroups()) {
        const allStudents = group.getStudents();
        for (let student1 = 0; student1 < allStudents.length; student1++) {
          for (let student2 = student1 + 1; student2 <
            allStudents.length; student2++) {
            totalScore += this._relationships[student1][student2 -
                student1 - 1];
          }
        }
      }
      return totalScore;
    }

    calculateGroups() {
      const {
        className,
        sheetName = 'Student Groups',
        sheetNameColumnName = 'Sheet Name',
        spreadsheetColumn = 'Spreadsheet',
        attemptedDepth = 1000,
      } = this._args;
      const settingsSheet = getDataSheet().getMapData(sheetName).
          get(className);
      if (settingsSheet == null) {
        throw new
        Error('Could not find class \'' + className +
        '\' in settings sheet \'' + sheetName +
        '\' in GroupCreator.calculateGroups()');
      }

      const t_spreadsheetId = settingsSheet.get(spreadsheetColumn);
      if (t_spreadsheetId == null) {
        throw new
        Error('Could not find spreadsheet for class \'' +
        className + '\' in GroupCreator.calculateGroups()',
        );
      }

      const groupSpreadsheet =
        new SpreadsheetGS(t_spreadsheetId);
      if (groupSpreadsheet == null) {
        throw new
        Error('Could not create spreadsheet object in ' +
            'GroupCreator.calculateGroups()');
      }

      const t_sheetNameColumn =
        settingsSheet.get(sheetNameColumnName);
      if (t_sheetNameColumn == null) {
        throw new
        Error('Could not find column that contains sheet' +
            ' name in GroupCreator.calculateGroups()');
      }

      setCache('spreadsheetId', t_spreadsheetId);
      setCache('sheetName', t_sheetNameColumn);

      const groupData =
        groupSpreadsheet.getMapData(t_sheetNameColumn);
      if (groupData == null) {
        throw new
        Error('Could not find sheet name \'' + sheetName +
        '\' on spreadsheet in GroupCreator.calculateGroups()');
      }
      if (groupData.getKeys().length == 0) {
        Logger.log('WARNING: No students found for ' +
            'calculateGroups()');
      }
      // Read in all students and establish relationships
      const rows = groupData.getKeys();
      for (let student1 = 0; student1 < rows.length;
        student1++) {
        const t_student = groupData.get(rows[student1]);
        if (t_student == null) {
          throw new
          Error('Could not find student in ' +
            'GroupCreator.calculateGroups()');
        }
        let student1Object = new StudentForGroups(
            rows[student1], student1 + 2);
        student1Object = this.addStudent(student1Object);
        this._relationships.push([]);

        const columns = t_student.getKeys();
        for (let student2 = student1 + 1; student2 <
            columns.length; student2++) {
          const t_score =
            t_student.get(columns[student2]);
          if (t_score == null) {
            throw new
            Error('Could not find student 2 in ' +
                'GroupCreator.calculateGroups()');
          }

          let student2Object =
            new StudentForGroups(columns[student2],
                student2 + 2);
          student2Object =
            this.addStudent(student2Object);
          this._relationships[student1].push(+t_score);
        }
      }

      // Try to make the groups
      for (let d = 0; d < attemptedDepth; d++) {
        const set = new GroupSet(this._students.length,
            this._limitGroups);
        for (let s = 0; s < this._students.length; s++) {
          set.addStudentToRandomGroup(this._students[s]);
        }

        const score =
            set.setScore(this.calculateScore(set));

        if (this._minimumGroupSet != undefined) {
          if (score < this._minimumGroupSet.getScore()) {
            this._minimumGroupSet = set;
          }
        } else {
          this._minimumGroupSet = set;
        }
      }
    }

    displayGroupSet() {
      const {
        acceptGroupsFunction = 'acceptGroups',
        calculateGroupsFunction = 'calculateGroups',
      } = this._args;

      const currentSheet = new SpreadsheetGS();
      currentSheet.activateUi();

      if (this._minimumGroupSet == undefined) {
        throw new
        Error('Could not get minimum group set in ' +
            'GroupCreator.displayGroupSet()');
      }
      const studentGroups =
        this._minimumGroupSet.getGroups();

      // Display the best group set
      let display = '';
      let groupNumber = 0;
      for (const group of studentGroups) {
        groupNumber++;
        display += '<h2>Group ' + groupNumber +
            '</h2><ol>';
        for (const student of group.getStudents()) {
          display += '<li>' + student.getName() +
          '</li>';
        }
        display += '</ol>';
      }

      const sidebarAcceptButton: SidebarButton =
        {} as SidebarButton;
      sidebarAcceptButton.text = 'Accept';
      sidebarAcceptButton.function =
        acceptGroupsFunction;
      sidebarAcceptButton.close = true;
      sidebarAcceptButton.wait = true;

      const sidebarDeclineButton: SidebarButton =
        {} as SidebarButton;
      sidebarDeclineButton.text = 'Decline';
      sidebarDeclineButton.function =
        calculateGroupsFunction;
      sidebarDeclineButton.close = true;
      sidebarDeclineButton.wait = true;

      setCache('minimumGroupSet',
          this._minimumGroupSet.convertToStringArrays());
      setCache('minimumGroupSetValues',
          this._minimumGroupSet.convertToNumberArrays());
      currentSheet.showSidebar(display, 'Groups',
          [sidebarAcceptButton, sidebarDeclineButton]);
    }

    addStudent(student: StudentForGroups):
        StudentForGroups {
      for (const s of this._students) {
        if (s.getName() == student.getName()) return s;
      }
      this._students.push(student);
      return student;
    }

    getStudents(): Array<StudentForGroups> {
      return this._students;
    }
}

function acceptGroups(emailAddress: string,
    className: string): boolean {
  const spreadsheet = new SpreadsheetGS(
      getCache<string>('spreadsheetId'));
  const sheet = spreadsheet.getSheet(
      getCache<string>('sheetName'));
  const groupSet =
    getCache<Array<Array<string>>>('minimumGroupSet');
  const groupSetValues = getCache<Array<Array<number>>>
  ('minimumGroupSetValues');

  let body = 'Next ' + className + ' groups:\n';

  let groupNumber: number = 0;
  for (const group of groupSet) {
    groupNumber++;
    body += 'Group #' + groupNumber + '\n';
    for (let student1 = 0; student1 < group.length;
      student1++) {
      body += '\t' + group[student1] + '\n';
    }
    body += '\n';
  }

  for (const group of groupSetValues) {
    for (let student1 = 0; student1 < group.length;
      student1++) {
      for (let student2 = student1 + 1; student2 <
        group.length; student2++) {
        const score = +sheet.getValue(group[student2],
            group[student1]);
        sheet.setValue((score + 1).toString(),
            group[student2], group[student1]);
      }
    }
  }

  const email = MailApp.sendEmail(emailAddress,
      className + ' Groups', body);
  return true;
}
