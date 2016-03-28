image-info: Makefile 800/*.jpg
	echo "{" > image-info
	identify 800/*.jpg -format '"%f": { "width": %w, "height": %h },\n' >> image-info
	echo "}" >> image-info
