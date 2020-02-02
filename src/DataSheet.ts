import {SpreadsheetGS} from './sheets/SpreadsheetGS';
import {DriveGS} from './drive/DriveGS';

/**
 * Gets the data sheet for the current script. Uses the script ID to name
 *  the data sheet if it has not been created already.
 *
 * @param {string} name the name of the Spreadsheet to use; if 'id', then
 *  this function will use the script ID for the name of the sheet; otherwise
 *  will use 'gse-tools Settings' as the name of the sheet
 * @return {SpreadsheetGS} the data sheet
 */
export function getDataSheet(name: string = 'gse-tools Settings'):
  SpreadsheetGS {
  if (name == 'id') name = ScriptApp.getScriptId();
  return new SpreadsheetGS(new DriveGS().getOrCreateFileByName(name).getId());
}
