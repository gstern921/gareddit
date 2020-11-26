import { FieldError } from "../resolvers/user";
import { MINIMUM_USERNAME_LENGTH } from "../config/constants";

const validateUsername = (
  username: string,
  fieldName: string = "username"
): FieldError[] | null => {
  const errors = [];
  if (username.length < MINIMUM_USERNAME_LENGTH) {
    errors.push({
      field: fieldName,
      message: `User name must be at least ${MINIMUM_USERNAME_LENGTH} characters long.`,
    });
  }
  if (username.includes("@")) {
    errors.push({
      field: fieldName,
      message: `User name must not contain an @ symbol.`,
    });
  }

  return errors.length ? errors : null;
};
export default validateUsername;
