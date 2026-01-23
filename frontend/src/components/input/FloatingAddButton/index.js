import Icon from "@mui/material/Icon";
import RABox from "components/RABox";

function FloatingAddButton({ onClick }) {
  return (
    <RABox
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="3.25rem"
      height="3.25rem"
      bgColor="white"
      shadow="sm"
      borderRadius="50%"
      position="fixed"
      right="2rem"
      bottom="2rem"
      zIndex={99}
      color="dark"
      sx={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Icon fontSize="small" color="inherit">
        add
      </Icon>
    </RABox>
  );
}

export default FloatingAddButton;
