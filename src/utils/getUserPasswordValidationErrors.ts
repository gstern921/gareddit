import { FieldError } from "../resolvers/user";
import { MINIMUM_PASSWORD_LENGTH } from "../config/constants";

const validatePassword = (
  password: string,
  fieldName: string = "password"
): FieldError[] | null => {
  const errors = [];
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.push({
      field: fieldName,
      message: `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long.`,
    });
  }

  return errors.length ? errors : null;
};
export default validatePassword;
