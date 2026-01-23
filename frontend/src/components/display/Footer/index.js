import PropTypes from "prop-types";

import Link from "@mui/material/Link";

import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

import typography from "assets/theme/base/typography";

function Footer({ company, links }) {
  const { href, name } = company;
  const { size } = typography;

  const renderLinks = () =>
    links.map((link) => (
      <RABox key={link.name} component="li" px={2} lineHeight={1}>
        <Link href={link.href} target="_blank">
          <RATypography variant="button" fontWeight="regular" color="text">
            {link.name}
          </RATypography>
        </Link>
      </RABox>
    ));

  return (
    <RABox
      width="100%"
      display="flex"
      flexDirection={{ xs: "column", lg: "row" }}
      justifyContent="space-between"
      alignItems="center"
      px={1.5}
    >
      <RABox
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
        color="text"
        fontSize={size.sm}
        px={1.5}
      >
        &copy; {new Date().getFullYear()}, created by
        <Link href={href} target="_blank">
          <RATypography variant="button" fontWeight="medium">
            &nbsp;{name}&nbsp;
          </RATypography>
        </Link>
      </RABox>
      <RABox
        component="ul"
        sx={({ breakpoints }) => ({
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          listStyle: "none",
          mt: 3,
          mb: 0,
          p: 0,

          [breakpoints.up("lg")]: {
            mt: 0,
          },
        })}
      >
        {renderLinks()}
      </RABox>
    </RABox>
  );
}

Footer.defaultProps = {
  company: {
    href: "https://www.bihealth.org/",
    name: "Berlin Institute of Health at Charité",
  },
  links: [
    {
      href: "https://www.bihealth.org/de/forschung/arbeitsgruppe/ag-prasser-medizininformatik",
      name: "About Us",
    },
    { href: "", name: "License" },
  ],
};

Footer.propTypes = {
  company: PropTypes.objectOf(PropTypes.string),
  links: PropTypes.arrayOf(PropTypes.object),
};

export default Footer;
