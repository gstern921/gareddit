import { FieldError } from "../resolvers/user";
import validateUserEmailAddress from "./getUserEmailAddressValidationErrors";
import validateUserPassword from "./getUserPasswordValidationErrors";
import validateUsername from "./getUsernameValidationErrors";
import {
  DEFAULT_USERNAME_FIELDNAME,
  DEFAULT_USER_EMAIL_ADDRESS_FIELDNAME,
  DEFAULT_USER_PASSWORD_FIELDNAME,
} from "../config/constants";

const validateRegister = (
  fields: {
    username: { value: string; fieldName?: string };
    password: { value: string; fieldName?: string };
    email: { value: string; fieldName?: string };
  } = {
    username: { value: "", fieldName: DEFAULT_USERNAME_FIELDNAME },
    password: { value: "", fieldName: DEFAULT_USER_PASSWORD_FIELDNAME },
    email: { value: "", fieldName: DEFAULT_USER_EMAIL_ADDRESS_FIELDNAME },
  }
): FieldError[] | null => {
  let errors: FieldError[] = [];

  const usernameErrors = validateUsername(
    fields.username.value,
    fields.username.fieldName
  );

  if (usernameErrors) {
    errors = errors.concat(usernameErrors);
  }

  const passwordErrors = validateUserPassword(
    fields.password.value,
    fields.password.fieldName
  );

  if (passwordErrors) {
    errors = errors.concat(passwordErrors);
  }

  const emailErrors = validateUserEmailAddress(
    fields.email.value,
    fields.email.fieldName
  );

  if (emailErrors) {
    errors = errors.concat(emailErrors);
  }

  return errors.length ? errors : null;
};
export default validateRegister;
