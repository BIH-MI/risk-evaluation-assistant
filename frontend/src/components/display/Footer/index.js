import PropTypes from "prop-types";
import { Link as RouterLink } from "react-router-dom";
import Link from "@mui/material/Link";
import { useTranslation } from "react-i18next";

import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

import typography from "assets/theme/base/typography";

function Footer({ company, links }) {
  const { t } = useTranslation();
  const { href, name } = company;
  const { size } = typography;

  // Helper function to map English names to translation keys
  const getTranslatedName = (englishName) => {
    switch (englishName) {
      case "About Us":
        return t("footer.aboutUs", "About Us");
      case "Documentation":
        return t("footer.documentation", "Documentation");
      case "License":
        return t("footer.license", "License");
      default:
        return englishName;
    }
  };

  const renderLinks = () =>
    links.map((link) => (
      <RABox key={link.name} component="li" px={2} lineHeight={1}>
        {link.route ? (
          /* Internal Route Link */
          <Link component={RouterLink} to={link.route}>
            <RATypography variant="button" fontWeight="regular" color="text">
              {getTranslatedName(link.name)}
            </RATypography>
          </Link>
        ) : (
          /* External Href Link */
          <Link href={link.href} target="_blank">
            <RATypography variant="button" fontWeight="regular" color="text">
              {getTranslatedName(link.name)}
            </RATypography>
          </Link>
        )}
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
      mt={10}
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
        &copy; {new Date().getFullYear()}, {t("footer.createdBy", "created by")}
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
      href: "https://www.bihealth.org",
      name: "About Us",
    },
    {
      href: "https://github.com/BIH-MI/risk-evaluation-assistant/blob/main/LICENSE.md",
      name: "License",
    },
  ],
};

Footer.propTypes = {
  company: PropTypes.objectOf(PropTypes.string),
  links: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      href: PropTypes.string,
      route: PropTypes.string,
    })
  ),
};

export default Footer;
