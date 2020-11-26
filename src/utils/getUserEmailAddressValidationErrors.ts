import { FieldError } from "../resolvers/user";

const validateUserEmailAddress = (
  userEmailAddress: string,
  fieldName: string = "email"
): FieldError[] | null => {
  const errors = [];
  if (!userEmailAddress.includes("@")) {
    errors.push({
      field: fieldName,
      message: `invalid email.`,
    });
  }

  return errors.length ? errors : null;
};
export default validateUserEmailAddress;
